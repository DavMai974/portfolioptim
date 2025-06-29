from flask import abort, Flask, jsonify, request
import os
import datetime
import numpy as np
import yfinance as yf
from flask_cors import CORS
import time
import firebase_admin
from firebase_admin import auth, exceptions
import numpy as np
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
app_options = {'projectId': 'YOUR_PROJECT_ID'}
default_app = firebase_admin.initialize_app(options=app_options)
CORS(app, origins=["https://YOUR_PROJECT_ID.wl.r.appspot.com", "http://localhost:8001"], 
    supports_credentials=True) # Access-Control-Allow-Credentials to True (A priori inutile car correspondrai au header Credentials déjà défini ici).
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=2, x_host=2) # we need to tell werkzeug that gcp has 2 proxies: google frontend and load balancer.

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"

@app.route('/api/session_logout', methods=['GET'])
def session_logout():
    response = jsonify({'status': 'success'})
    response.set_cookie('session', expires=0) # la date d'expiration étant mise à 0 alors le cookie expire directement (voir backend/README.md).
    return response, 200

def refresh_token(id_token: str) -> str:
    expires_in = datetime.timedelta(seconds=300)
    try:
        session_cookie = auth.create_session_cookie(id_token, expires_in=expires_in)
        expires = datetime.datetime.now() + expires_in
    except auth.InvalidIdTokenError:
        return abort(401, 'Invalid ID token.')
    return session_cookie, expires

def verify_or_refresh_token(request):
    """For local dev purpose, when LOCALHOST is '1' then refresh_session_cookie is always False."""
    refresh_session_cookie = False
    session_cookie = None
    expires = None
    if not os.environ.get("LOCALHOST"):
        id_token = request.json["id_token"]
        session_cookie = request.cookies.get('session')
        if not session_cookie:
            return jsonify({'status': 'error', 'message': 'No session cookie.'}), 401
        # Verify the session cookie. In this case an additional check is added to detect
        # if the user's Firebase session was revoked, user deleted/disabled, etc.
        try:
            decoded_claims = auth.verify_session_cookie(session_cookie, check_revoked=True)
        except auth.InvalidSessionCookieError:
            # Session cookie is invalid, expired or revoked.
            session_cookie, expires = refresh_token(id_token)
            refresh_session_cookie = True
        except auth.RevokedIdTokenError:
            return jsonify({'status': 'error', 'message': 'Token revoked, inform the user to reauthenticate or signOut().'}), 401
        except auth.UserDisabledError:
            return jsonify({'status': 'error', 'message': 'Token belongs to a disabled user record.'}), 401
        except auth.InvalidIdTokenError:
            return jsonify({'status': 'error', 'message': 'Token is invalid'}), 401
    return refresh_session_cookie, {"cookie": session_cookie, "expires": expires}

@app.route("/api/session_login", methods=["POST"])
def session_login():
    id_token = request.json["id_token"]
    try:
        decoded_claims = auth.verify_id_token(id_token, clock_skew_seconds=60)
        if time.time() - decoded_claims["auth_time"] < 5 * 60:
            # Create the session cookie. This will also verify the ID token in the process.
            # The session cookie will have the same claims as the ID token.
            expires_in = datetime.timedelta(seconds=300) # expiry must be at least 300 seconds.
            session_cookie = auth.create_session_cookie(id_token, expires_in=expires_in)
            response = jsonify({'status': 'success'})
            # Set cookie policy for session cookie.
            expires = datetime.datetime.now() + expires_in
            # httponly est un attribut du header html Set-cookie qui permet d'empêcher le navigateur d'accéder au cookie
            # par javascript. secure, attribut du même header, permet au navigateur de n'envoyé le cookie qu'à une url https.
            response.set_cookie(
                'session', session_cookie, expires=expires, httponly=True, secure=True, samesite="None")
            return response
        return jsonify({'status': 'error', 'message': 'Recent sign in required.'}), 401
    except auth.InvalidIdTokenError:
        return jsonify({'status': 'error', 'message': 'Invalid ID token.'}), 401
    except exceptions.FirebaseError:
        return jsonify({'status': 'error', 'message': 'Failed to create a session cookie.'}), 401

@app.route("/api/sma", methods=["POST"])
def get_sma():
    stock_name = request.json["stock_name"]
    window = request.json["window"]
    interval = request.json["interval"]
    stock_ticker = yf.Ticker(stock_name)
    hist = stock_ticker.history(period='1y', interval="1d")
    hist["SMA"] = hist["Open"].rolling(window=int(window)).mean()
    
    hist.dropna(inplace=True)
    data = []
    for _time, values in hist.iterrows():
        data.append(
            {
                "time": datetime.datetime.strftime(_time, "%Y-%m-%d"),
                "sma": values.SMA
            }
        )
    return jsonify({"rows": data}), 200

def pct_change_on_returns(stock_list, start_date, end_date, period=1, freq=None):
    """Compute fractional change between current and the prior element for each stock.
    Remove stock with no data from the stock list.
    Returns:
    hist: Dataframe
    missing_data: dict[str, bool]
    new_stock_list: list"""
    hist = yf.download([stock['name'] for stock in stock_list], start=start_date, end=end_date, interval="1d", auto_adjust=False)['Adj Close']
    missing_data = []
    new_stock_list = []
    for stock in stock_list:
        empty = all(hist[stock['name']].isna())
        missing_data.append({
            "name": stock['name'],
            "bool": empty
        })
        if not empty:
            new_stock_list.append(stock)
    hist = hist[[stock['name'] for stock in missing_data if not stock['bool']]] # remove stocks with no data.
    kwargs = {}
    if freq:
        kwargs.update({"freq": freq})
    else:
        kwargs.update({"periods": period})
    hist = hist.pct_change(**kwargs)
    hist.dropna(inplace=True)
    return hist, missing_data, new_stock_list

@app.route("/api/get_portfolio_optim", methods=["POST"])
def get_portfolio_optim():
    try:
        refresh_session_cookie, cookie_info = verify_or_refresh_token(request)
    except Exception as exc:
        raise Exception from exc 
    period = int(request.json["period"])
    stock_list = request.json["stock_list"]
    risk_free_rate = float(request.json["risk_free_rate"])
    start_date = request.json["start_date"]
    end_date = request.json["end_date"]
    stock_returns, missing_data, stock_list = pct_change_on_returns(stock_list, start_date, end_date, period=period)
    if stock_returns.empty:
        return "No data", 400
    num_ports = 1000
    all_weights = np.zeros((num_ports, len(stock_list)))
    ret_arr = np.zeros(num_ports)
    vol_arr = np.zeros(num_ports)
    sharpe_arr = np.zeros(num_ports)
    #### !!!! ATTENTION: Si dessous il y a 2 choix, il me semble plus logique pour le calcul de prendre la moyenne 
    #### et la covariance sur la période demandé (horizon), contrairement à ce qu'on peut voir sur internet où il y a annualisation (moyenné sur 250 jours).
    # mean_returns_over_year = stock_returns.mean() * (250 - period)  # A vérif le - period. Pour moi c'est le nombre de periode continue de period jour parmis les 250 jour.
    mean_return_over_period = stock_returns.mean()
    # cov_returns_over_year = stock_returns.cov() * (250 - period)
    cov_returns_over_year = stock_returns.cov()
    for i in range(num_ports):
        weights = np.array(np.random.random(len(stock_list)))
        weights = weights / np.sum(weights)
        all_weights[i, :] = weights
        ret_arr[i] = np.sum(mean_return_over_period * weights)
        vol_arr[i] = np.sqrt(np.dot(weights.T, np.dot(cov_returns_over_year, weights)))
        sharpe_arr[i] = (ret_arr[i] - risk_free_rate) / vol_arr[i]
    data = {}
    data["return"] = list(ret_arr)
    data["volatility"] = list(vol_arr)
    data["sharpe_ratio"] = list(sharpe_arr)
    data["portfolio_distributions"] = [", ".join([str(round(float(x), 2)) for x in weight]) + "\nSharpe ratio: " + str(round(float(shrp), 3)) for weight, shrp in zip(all_weights, list(sharpe_arr))]
    optimal_point = int(sharpe_arr.argmax())
    optimal_weights = all_weights[optimal_point]
    optimal_ptf = stock_returns * optimal_weights
    optimal_ptf = optimal_ptf.sum(axis=1) * 100
    dates = [str(dt) for dt in optimal_ptf.index]
    optimal_rts = [float(val) for val in optimal_ptf.values]
    data["optimal_portfolio"] = {
                    "distribution": ", ".join([str(round(x, 2)) for x in optimal_weights]), 
                    "return": [ret_arr[optimal_point]], 
                    "volatility": [vol_arr[optimal_point]], 
                    "sharpe_ratio": [sharpe_arr[optimal_point]], 
                    "result": ", ".join([stock["name"] + f": {round(weight, 2)} %" for stock, weight in zip(stock_list, optimal_weights)])
                }
    data["dates"] = dates
    data["optimal_returns"] = optimal_rts * 100
    data["missing_data"] = missing_data
    response = jsonify({"data": data})
    if refresh_session_cookie:
        response.set_cookie(
            'session', cookie_info["cookie"], expires=cookie_info["expires"], httponly=True, secure=True, samesite="none")
    return response, 200

@app.route("/api/value_at_risk", methods=["POST"])
def value_at_risk():
    try:
        refresh_session_cookie, cookie_info = verify_or_refresh_token(request)
    except Exception as exc:
        raise Exception from exc
    period = int(request.json["period"])
    alpha = float(request.json["alpha"])
    start_date = request.json["start_date"]
    end_date = request.json["end_date"]
    stock_list = request.json["stock_list"]
    stock_returns, missing_data, stock_list = pct_change_on_returns(stock_list, start_date, end_date, period=period)
    monthly_returns, missing_data_monthly, stock_list = pct_change_on_returns(stock_list, start_date, end_date, freq="ME")
    dates = [str(dt) for dt in stock_returns.index]
    monthly_returns_dates = [str(dt) for dt in monthly_returns.index]
    pft_returns = np.zeros(shape=stock_returns.shape[0])
    pft_monthly_returns = np.zeros(shape=monthly_returns.shape[0])
    for stock in stock_list:
        pft_returns += stock_returns[stock["name"]].values * float(stock["weight"]) * 100
        pft_monthly_returns += monthly_returns[stock["name"]].values * float(stock["weight"]) * 100
    distribution = pft_returns.copy()
    distribution.sort()
    value_at_risk = np.quantile(distribution, float(alpha))
    # get the bin's histogram with the most values. We want 100 bin.
    # Make sure the front also display 100 bins.
    _max = max(distribution)
    _min = min(distribution)
    step = (_max - _min) / 100
    max_hist = np.histogram(distribution, bins=[float(_min + step * x) for x in range(101)])
    bin_max = int(max(max_hist[0]))
    data = {
        "var": round(value_at_risk, 3),
        "pnl_dist": [float(elt) for elt in distribution],
        "returns": [float(val) for val in pft_returns],
        "monthly_returns": [float(val) for val in pft_monthly_returns],
        "dates": dates,
        "monthly_returns_dates": monthly_returns_dates,
        "bin_max": bin_max
    }
    response = jsonify({"data": data})
    if refresh_session_cookie:
        response.set_cookie(
            'session', cookie_info["cookie"], expires=cookie_info["expires"], httponly=True, secure=True, samesite="none")
    return response

@app.route("/api/get_stock", methods=["POST"])
def getstock():
    stock_name = request.json["stock_name"]
    stock_ticker = yf.Ticker(stock_name)
    hist = stock_ticker.history(period='1y', interval="1d")
    data = []
    for _time, values in hist.iterrows():
        data.append(
            {
                "time": datetime.datetime.strftime(_time, "%Y-%m-%d"),
                "stock": values.Open,
            }
        )
    return jsonify({"rows": data})


if __name__ == "__main__":
    os.environ['LOCALHOST'] = "1"
    app.run(host="127.0.0.1", port=8002, debug=True)