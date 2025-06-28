import './App.css';
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { initializeApp } from 'firebase/app';
import Plot from 'react-plotly.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword , createUserWithEmailAndPassword, signOut } from 'firebase/auth';

const firebaseConfig = {
// your firebase config
};

const conf = initializeApp(firebaseConfig);
const userAuth = getAuth(conf)
const provider = new GoogleAuthProvider();
// provider.addScope('https://www.googleapis.com/auth/contacts.readonly');

type StockData = {
  data: any,
  hook: any,
}

function SigninGoogle() {
  function handleLogin() {
    signInWithPopup(userAuth, provider)
    .then((result) => {
      // This gives you a Google Access Token. You can use it to access the Google API.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      // const token = credential?.accessToken;
      // document.cookie = "token=" + token;
      // The signed-in user info.
      // const user = result.user;
      // IdP data available using getAdditionalUserInfo(result)
      // ...
    }).catch((error) => {
      // Handle Errors here.
      const errorCode = error.code;
      const errorMessage = error.message;
      // The email of the user's account used.
      const email = error.customData.email;
      // The AuthCredential type that was used.
      const credential = GoogleAuthProvider.credentialFromError(error);
      // ...
    });
  }
  return (
    <div>
      Connect with google:
      <button onClick={handleLogin} className="gsi-material-button">
        <div className="gsi-material-button-state"></div>
        <div className="gsi-material-button-content-wrapper">
          <div className="gsi-material-button-icon">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{display: 'block'}}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          </div>
          <span style={{display: 'none'}}>Sign in with Google</span>
        </div>
      </button>
    </div>
  )
}

function ToolsMenu({data, hook}: StockData) {
  // Component for choosing the tool (example with 2 tools)
  const [toolName, setToolName] = useState("sma")
  function changeTool(event: any) {
    console.log(event.target.name)
    if (event.target.name === "sma") {
      setToolName("sma")
    }
    if (event.target.name === "mlpclassifier") {
      setToolName("mlpclassifier")
    }
  }
  let tool;
  if (toolName === "sma") {
    tool = <Sma data={data} hook={hook}/>;
  }
  if (toolName === "mlpclassifier") {
    tool = <MLPClassifier/>;
  }

  return (
    <div>
      <button name="sma" onClick={changeTool}>SMA</button>
      <button name="mlpclassifier" onClick={changeTool}>MLP classifier</button>
      {tool}
    </div>
  )
}

type StockPoint = {
  stock: number,
  sma: number,
  time: string
}

type SmaPoint = {
  sma: number,
  time: string
}

type StockSequence = {
  rows: StockPoint[]
}

function GetStock() {
  // get stock and put it in redis
  // render form for choosing stock and buttons to choose a tools to work on this stock (sma, mlpclassifier, ...)
  const [data, setData] = useState<StockPoint[]>([]);
  function handleNewData(oldData: StockPoint[], tempData: StockSequence) {
    let newData: StockPoint[] = [];
    for (let i = 0; i < oldData.length; i++) {
      if (i < (oldData.length - tempData.rows.length)) {
        newData.push({...oldData[i], "sma": oldData[i]["stock"]})
      } else {
        newData.push({...oldData[i], "sma": tempData.rows[i - (oldData.length - tempData.rows.length)].sma})
      }
    }
    setData(newData)
  }
  function handleSubmit(event: any) {
    event.preventDefault()
    fetch(process.env.REACT_APP_BACK_URL + '/api/get_stock',
      {
        method: 'POST',
        body: JSON.stringify({
          stock_name: event.target.elements.stockname.value, 
          period: event.target.elements.period.value, 
          interval: event.target.elements.interval.value,
        }), // input tag name is stockname
        headers: {
          "Content-Type": "application/json",
        }
      }
    )
    .then(res => {
      return res.json()
    })
    .then(res => {
      setData(res.rows)
    })
    .catch(err => console.error(err));
  }
  // Display a form, the chart and the ToolsMenu object which permit the user to choose a tool
  // to apply some calculation on the queried data.
  return (
    <div className="div-get-stock">
      <Chart data={data}/>
      <ToolsMenu data={data} hook={handleNewData}/>
    </div>
  )
}

function handleSignOut() {
  signOut(userAuth).then(() => {
    console.log("User successfully signed out.")
  }).catch((error) => {
    console.log("Error signing out user.")
  });
}

function SignOut() {
  return (
    <li className="div-button-signout">
        <button
          name="signout"
          onClick={handleSignOut}
        >
          Sign out
        </button>
    </li>
  )
}

type StockPointArray = {
  data: StockPoint[]
}

function Chart({data}: StockPointArray) {
  // Input: in data we have all array representing Y axis values of every line to display + the X axis time.
  //        Each array have elements representing (X, Y) coordinate.
  const linesNames = getLinesName(data); // Get Y axis name.
  let lines = []
  if (linesNames.length > 0) {
    lines = linesNames?.map(name => // For each line name create a Line object to be put in the LineChart object.
      <Line key={name + "-chart"} type="monotone" dataKey={name} stroke="#82ca9d" dot={false}/>
    )
  } else {
    return (
      <div className='chartdiv'>
        NOTHING TO DISPLAY
      </div>
    )
  }
  return (
    <div className='chartdiv'>
      <LineChart width={500} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" padding={{ left: 30, right: 30 }} />
        <YAxis />
        <Tooltip />
        <Legend />
        {lines}
      </LineChart>
    </div>
  )
}

function getLinesName(data: SmaPoint[]) {
  // Get each line y axis data points name.
  // For example if there is only one line then we want the y axis data point name.
  // This imply we dont want the x axis name which is 'time'.
  let names = [];
  if (data.length > 0) {
    for (let _name of Object.keys(data[0])) {
      if (_name !== 'time') {
        names.push(_name)
      }
    }
  }
  return names
}

type SmaInput = {
  data: StockPoint,
  hook: any
}

function Sma({data, hook}: SmaInput) {
  // TODO: récupére les data dans redis et affiche le sma sur le même chart créé par la fonction get_stock.
  // faire le sma exp: calculer les log return + la variance et appliquer la formule de:
  // https://portfoliooptimizer.io/blog/volatility-forecasting-simple-and-exponentially-weighted-moving-average-models/#volatility-forecasting-formulas-1
  function handleSubmit(event: any) {
    event.preventDefault()
    fetch(process.env.REACT_APP_BACK_URL + '/api/sma',
      {
        method: 'POST',
        body: JSON.stringify({
          stock_name: event.target.elements.stock_name.value, 
          window: event.target.elements.window.value, 
          interval: event.target.elements.interval.value,
        }),
        headers: {
          "Content-Type": "application/json",
        }
      }
    )
    .then(res => {
      return res.json()
    })
    .then(res => {
      hook(data, res);
    })
    .catch(err => console.error(err));
  }
  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>Enter SMA window</label>
        <input name="window" type="text"/>
        <label>Stock name</label>
        <input name="stock_name" type="text"/>
        <label>Interval</label>
        <input name="interval" type="text"/>
        <input type="submit"></input>
      </form>
    </div>
  )
}

function MLPClassifier() {
  const template = {
  }
  return (
    <>
    MLPClassifier
    </>
  )
}


function Tool2() {
  const template = {
  }
  return (
    <>
    Tool2
    </>
  )
}

function logingOut(hook: any) {
  fetch(process.env.REACT_APP_BACK_URL + '/api/session_logout',
    {
      method: 'GET',
      credentials: 'include'
    }
  )
  .then(res => {
    return res.json();
  })
  .then(content => {
    if (content['status'] !== 'error') {
      hook(false);
    } else {
      alert('Problem loging out.')
    }
  })
}

function LoginPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    // Purpose: this effect purpose is to know if the user is already logged in, and if so
    // display directly home interface. 
    // An effect is called only when the component is rendered and when the effect's
    // dependencies are modified. This one has no dependencies (empty array []) so it is called
    // only at first rendering.
    // We want the component to update wether te user is connected or not, that is to say
    // display login interface when the user is not logged in, and display the home interface
    // when the user is logged in, so
    // this effect hook define the onAuthStateChanged callback, which change isLoggedIn state
    // wether the user is logged in or not to update the component. This effect hook has no
    // dependencies because it serve the purpose of only attaching a callback to onAuthStateChanged
    // when the component is mounted for the first time, and this is this callback that will change
    // state of isLoggedIn for re-rendering the component.
    const subscriber = userAuth.onAuthStateChanged(user => {
      if (user) {
        user.getIdToken().then(idToken => {
          fetch(process.env.REACT_APP_BACK_URL + '/api/session_login',
            {
              method: 'POST',
              body: JSON.stringify({
                id_token: idToken
              }), // input tag name is stockname
              headers: {
                "Content-Type": "application/json",
              },
              credentials: 'include'
            }
          )
          .then(res => {
            return res.json();
          })
          .then(content => {
            if (content['status'] !== 'error') {
              setIsLoggedIn(true);
            } else {
              logingOut(setIsLoggedIn)
              handleSignOut()
              alert('Logged out.')
          }
          })
        })
      } else {
        logingOut(setIsLoggedIn)
        handleSignOut()
        alert('Logged out.')
      }
    });
    return subscriber; // unsubscribe on unmount
  }, []);
  let content;
  // content = <SMA loginHook={setIsLoggedIn}/>
  if (isLoggedIn) { 
    content = <Home/>
  } else {
    content = <SigninGoogle/>
  }
  return (
    <div>
      {content}
    </div>
  )
}

function Home() {
  let content;
  const [appTab, setAppTab] = useState("home");
  function handleTool(event: any) {
    event.preventDefault()
    setAppTab(event.target.id)
    return;
  }
  if (appTab === "contact") {
    content = <Contact/>
  }
  if (appTab === "home") {
    content = <ApplicationTab/>
  }
  return (
    <div className='menus'>
      <div className='menu-horyzontal'>
        <ul>
          <li><a href="#home" id="home" onClick={handleTool}>Home</a></li>
          <li><a href="#contact" id="contact" onClick={handleTool}>Contact</a></li>
          <SignOut/>
        </ul>
      </div>
      {content}
    </div>
  )
}

function ApplicationTab() {
  let content;
  const [tool, setTool] = useState("portfolio-optimization");
  function handleTool(event: any) {
    event.preventDefault()
    setTool(event.target.id)
    return;
  }
  if (tool === "sma") {
    content = <GetStock/>
  }
  if (tool === "portfolio-mean-var-optimization") {
    content = <PortfolioOptimTool/>
  }
  if (tool === "portfolio-value-at-risk") {
    content = <PortfolioValueAtRisk/>
  }
  if (tool === "contact") {
    content = <FakeComp2/>
  }
  if (tool === "streaming") {
    content = <Streaming/>
  }
  return (
    <div className='menu-vertical-tool'>
      <div className='menu-vertical'>
        <ul>
          <li><button onClick={handleTool} id="portfolio-mean-var-optimization">Portfolio mean variance optimization</button></li>
          <li><button onClick={handleTool} id="portfolio-value-at-risk">Portfolio value at risk</button></li>
          <li><button onClick={handleTool} id="sma">SMA</button></li>
          <li><button onClick={handleTool} id="streaming">Streaming</button></li>
        </ul>
      </div>
      <div className='home-content'>
        {content}
      </div>
    </div>
  )
}

function Streaming() {
  // Interface workflow:
  // 1. enter stock name and/or click start/stop button
  // 2. if entering a new stock name and connection is active then click on start/stop button
  // to deactivate connection then click again to activate connection.

  const [socket, setSocket] = useState<any>(null);
  const [startStop, setStartStop] = useState<boolean>(false);
  const [price, setPrice] = useState<any>(0);
  const [stockNames, setStockNames] = useState<string>('');
  function handleStartStop(event: any) {
    event.preventDefault();
    console.log("startstop");
    setStartStop(!startStop);
    return;
  }
  function handleStockName(event: any) {
    event.preventDefault();
    const stockName: string = event.target.elements.stockNameStreaming.value;
    setStockNames(stockName);
    return;
  }
  useEffect(() => {
    if (startStop) {
      if (!socket) {
        // Create WebSocket connection.
        let socket = new WebSocket("ws://localhost:8000/ws");
        // Listen for messages
        socket.addEventListener("message", (event: any) => {
          console.log("Message from server ", event.data);
          setPrice(event.data);
        });
        if (stockNames) {
          socket.send(stockNames);
        }
        setSocket(socket);
      } else {
        socket.send(stockNames);
      }
    } else {
      if (socket) {
        console.log("Close")
        socket.close()
      }
    }
  }, [startStop, price, stockNames]);
  return (
    <div>
      Streaming
      <button onClick={handleStartStop} id="start-stop">start/stop</button>
      <div>
        <form onSubmit={handleStockName}>
          <button id="add-stock">stock name</button>
          <input
            id="stockNameStreaming"
            type="text"
          />
        </form>
      </div>
      {price}
    </div>
  )
}

function Contact() {
  function handleOpenContact(event: any) {
    event.preventDefault()
    window.open("https://www.linkedin.com/in/david-m-53ab40165", '_blank')?.focus();
    return;
  }
  return (
    <div>
      <a href="www.linkedin.com/in/david-m-53ab40165" onClick={handleOpenContact}>David M.</a>
    </div>
  )
}

type StockName = {
  name: string
}

function handleStartDateUtil(event: any) {
  event.preventDefault();
  const newStartDate: string = event.target.elements.start_date_input.value;
  let date = new Date(newStartDate)
  if (date.toString() === 'Invalid Date') {
    alert('Wrong format.')
    return null;
  }
  return newStartDate;
}

function PortfolioOptimTool() {
  const [stockList, setStockList] = useState<StockName[]>([]);
  const [period, setPeriod] = useState<string>('');
  const [riskFreeRate, setRiskFreeRate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [messageMissingData, setMessageMissingData] = useState<string>('');
  function handleRiskFreeRate(event: any) {
    event.preventDefault();
    const newRiskFreeRate: string = event.target.elements.risk_free.value;
    setRiskFreeRate(newRiskFreeRate)
    return;
  }
  function handlePeriod(event: any) {
    event.preventDefault();
    const newPeriod: string = event.target.elements.period.value;
    setPeriod(newPeriod)
    return;
  }
  function handleStartDate(event: any) {
    const newStartDate = handleStartDateUtil(event)
    if (newStartDate) {
      setStartDate(newStartDate)
    }
    return;
  }
  function handleEndDate(event: any) {
    event.preventDefault();
    const newEndDate: string = event.target.elements.end_date_input.value;
    let date = new Date(newEndDate)
    if (date.toString() === 'Invalid Date') {
      alert('Wrong format.')
      return;
    }
    setEndDate(newEndDate)
    return;
  }
  function handleAddingStock(event: any) {
    event.preventDefault();
    const stockName: string = event.target.elements.stock.value;
    let newStockList: StockName[];
    const stockListObject = new Set(stockList.map(x => x.name))
    if (stockListObject.has(stockName)) {
      return;
    }
    newStockList = [...stockList] // I often make the mistake newObject = oldObject instead of newObject = [...oldObject], but this does not trigger re-rendering since I assign the SAME objet to a new.
    newStockList.push({name: stockName})
    setStockList(newStockList)
    return;
  }
  function handleDeletingStock(event: any) {
    event.preventDefault();
    const stockName: string = event.target.innerText;
    let newStockList: StockName[];
    newStockList = stockList.filter((stock: StockName) => stock.name !== stockName) // I often make the mistake newObject = oldObject instead of newObject = [...oldObject], but this does not trigger re-rendering since I assign the SAME objet to a new.
    setStockList(newStockList)
    return;
  }
  let content: StockNameInput = {names: stockList};
  return (
    <div className='div-portfolio-optim'>
      <div className='div-uis-portfolio-optim'>
        <PortfolioOptimUI period={period} stockList={stockList} riskFreeRate={riskFreeRate} startDate={startDate} endDate={endDate} missingDataSetter={setMessageMissingData}/>
      </div>
      <div className='div-user-input-output'>
        <div className='div-portfolio-form'>
          <form onSubmit={handlePeriod}>
            <button id="add-stock">Add horizon (days)</button>
            <input
              id="period"
              className="period"
              type="number"
              step="1"
            />
          </form>
          Horizon: {period}
          <form onSubmit={handleRiskFreeRate}>
            <button id="add-stock">Add risk free rate</button>
            <input
                className="risk-free-rate"
                id="risk_free"
                type="number"
                step="0.01"
                max="1"
            />
          </form>
          Risk Free Rate: {riskFreeRate}
          <form onSubmit={handleStartDate}>
            <button>Start date (YYYY-MM-DD)</button>
            <input
                id="start_date_input"
                type="date"
            />
          </form>
          Start date: {startDate}
          <form onSubmit={handleEndDate}>
            <button>End date (YYYY-MM-DD)</button>
            <input
                id="end_date_input"
                type="date"
            />
          </form>
          End date: {endDate}
          <form onSubmit={handleAddingStock}>
            <button id="add-stock">Add stock (ticker)</button>
            <input
                className="form-stock-name"
                id="stock"
                type="text"
            />
          </form>
          <StockNameList stockList={content} hook={handleDeletingStock}/>
        </div>
        <div className='missing-data-message'>
          {messageMissingData}
        </div>
      </div>
    </div>
  )
}

type InputPortfolioOptimUI = {
  stockList: StockName[],
  period: string,
  riskFreeRate: string,
  startDate: string,
  endDate: string,
  missingDataSetter: any
}


type MissingData = {
  name: string,
  bool: boolean
}

function PortfolioOptimUI({period, stockList, riskFreeRate, startDate, endDate, missingDataSetter}: InputPortfolioOptimUI) {
  const [returnVals, setReturnVals] = useState<number[]>([]);
  const [result, setResult] = useState<string>('');
  const [dates, setDates] = useState<string[]>([]);
  const [returns, setReturns] = useState<number[]>([]);
  const [volatilityVals, setVolatilityVals] = useState<number[]>([]);
  const [sharpeRatioVals, setSharpeRatioVals] = useState<number[]>([]);
  const [optimalPortfolio, setOptimalPortfolio] = useState<OptimalPortfolio>({distribution: [], return: [], volatility: [], sharpe_ratio: []});
  const [distributionsPortfolio, setDistributionsPortfolio] = useState<string[]>([]);
  var title = period ? 'Returns (%) after ' + period + ' days.' : 'Returns graph.'
  function handleMissingData(missingData: MissingData[]) {
    let stockWithNoData: string[] = [];
    missingData.forEach((stock) => {if (stock.bool) {stockWithNoData.push(stock.name)}});
    if (stockWithNoData.length > 0) {
      const message = 'Missing data for stocks: ' + stockWithNoData.join(', ');
      missingDataSetter(message);
    }
  }
  function handleStartCalculate(event: any) {
    event.preventDefault()
    userAuth.currentUser?.getIdToken().then(idToken => {
      fetch(process.env.REACT_APP_BACK_URL + '/api/get_portfolio_optim',
        {
          method: 'POST',
          body: JSON.stringify({
            id_token: idToken,
            period: period,
            stock_list: stockList, 
            risk_free_rate: riskFreeRate,
            start_date: startDate,
            end_date: endDate
          }), // input tag name is stockname
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include' // must be set to include to provide automatically the cookies from the server, which has been set at connection.
        }
      )
      .then(res => {
        if (!res.ok) throw new Error("No data or tickers do not exist.");
        else return res.json()
      })
      .then(res => {
        setReturnVals(res.data.return);
        setVolatilityVals(res.data.volatility);
        setSharpeRatioVals(res.data.sharpe_ratio);
        setOptimalPortfolio(res.data.optimal_portfolio);
        setDistributionsPortfolio(res.data.portfolio_distributions);
        setReturns(res.data.optimal_returns);
        setDates(res.data.dates);
        setResult(res.data.optimal_portfolio.result);
        handleMissingData(res.data.missing_data)
      })
      .catch(err => {
        alert(err)
      });
    })
  }
  const layout = {
    title: {
      text: title
    }
  }
  return (
    <div className='portfolio-optim-ui'>
      <PortfolioOptimCalculation handleCalculateHook={handleStartCalculate}/>
      <ScatterPlot result={result} returnVals={returnVals} volatilityVals={volatilityVals} sharpeRatioVals={sharpeRatioVals} optimalPortfolio={optimalPortfolio} distributionsPortfolio={distributionsPortfolio}/>
      <BarChartReturn dates={dates} returns={returns} layout={layout}/>
    </div>
  )
}

function PortfolioValueAtRisk() {
  const [stockList, setStockList] = useState<StockNameWeight[]>([]);
  const [period, setPeriod] = useState<string>('');
  const [alpha, setAlpha] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  function handlePeriod(event: any) {
    event.preventDefault();
    const newPeriod: string = event.target.elements.period.value;
    setPeriod(newPeriod)
    return;
  }
  function handleWeightInput(event: any) {
    event.preventDefault();
    const weight = event.target.value;
    const stockName = event.target.name;
    let newStockList: StockNameWeight[] = [];
    stockList.forEach((sn) => {
      if (sn.name === stockName) {
        sn.weight = weight;
      }
      newStockList.push(sn)
    })
    setStockList(newStockList)
  }
  function handleAlpha(event: any) {
    event.preventDefault();
    const newAlpha: string = event.target.elements.alpha.value;
    setAlpha(newAlpha);
    return;
  }
  function handleStartDate(event: any) {
    const newStartDate = handleStartDateUtil(event);
    if (newStartDate) {
      setStartDate(newStartDate);
    }
    return;
  }
  function handleEndDate(event: any) {
    event.preventDefault();
    const newEndDate: string = event.target.elements.end_date_input.value;
    let date = new Date(newEndDate)
    if (date.toString() === 'Invalid Date') {
      alert('Wrong format.')
      return;
    }
    setEndDate(newEndDate)
    return;
  }
  function handleAddingStock(event: any) {
    event.preventDefault();
    const stockName: string = event.target.elements.stock.value;
    let newStockList: StockNameWeight[];
    const stockListObject = new Set(stockList.map(x => x.name));
    if (stockName === '') {
      return;
    }
    if (stockListObject.has(stockName)) {
      return;
    }
    newStockList = [...stockList] // I often make the mistake newObject = oldObject instead of newObject = [...oldObject], but this does not trigger re-rendering since I assign the SAME object to a new.
    newStockList.push({name: stockName, weight: '0'})
    setStockList(newStockList)
    return;
  }
  function handleDeletingStock(event: any) {
    event.preventDefault();
    const stockName: string = event.target.innerText;
    let newStockList: StockNameWeight[];
    newStockList = stockList.filter((stock: StockNameWeight) => stock.name !== stockName) // I often make the mistake newObject = oldObject instead of newObject = [...oldObject], but this does not trigger re-rendering since I assign the SAME objet to a new.
    setStockList(newStockList)
    return;
  }
  let content: StockNameInputWeight = {names: stockList};
  var titleAssetAllocation = content.names.length > 0 ? 'Assets allocation' : ''
  return (
    <div className='div-portfolio-var'>
      <div>
        <PortfolioValueAtRiskUI alpha={alpha} stockList={stockList} period={period} startDate={startDate} endDate={endDate}/>
      </div>
      <div className='div-form-var'>
        <form onSubmit={handlePeriod}>
          <input
            id="period"
            type="number"
          />
          <button>Add horizon (days)</button>
        </form>
        horizon: {period}
        <form onSubmit={handleAlpha}>
          <input
            id="alpha"
            type="number"
            step="0.01"
            max="1"
          />
          <button>Alpha</button>
        </form>
        Alpha: {alpha}
        <form onSubmit={handleStartDate}>
          <button>Start date (YYYY-MM-DD)</button>
          <input
              id="start_date_input"
              type="date"
          />
        </form>
        Start date: {startDate}
        <form onSubmit={handleEndDate}>
          <button>End date (YYYY-MM-DD)</button>
          <input
              id="end_date_input"
              type="date"
          />
        </form>
        End date: {endDate}
        <form onSubmit={handleAddingStock}>
          <button id="add-stock">Add stock</button>
          <input
              className="form-stock-name"
              id="stock"
              type="text"
          />
        </form>
        {titleAssetAllocation}
        <StockNameListWithWeight stockList={content} hook={handleDeletingStock} weightHook={handleWeightInput}/>
      </div>
    </div>
  )
}

type InputPortfolioValueAtRiskUI = {
  stockList: StockName[],
  period: string,
  alpha: string,
  startDate: string,
  endDate: string,
}

function PortfolioValueAtRiskUI({stockList, alpha, period, startDate, endDate}: InputPortfolioValueAtRiskUI) {
  const [pnlDist, setPnlDist] = useState<number[]>([]);
  const [binMax, setBinMax] = useState<number>(0);
  const [dates, setDates] = useState<string[]>([]);
  const [monthlyReturnsDates, setMonthlyReturnsDates] = useState<string[]>([]);
  const [returns, setReturns] = useState<number[]>([]);
  const [monthlyReturns, setMonthlyReturns] = useState<number[]>([]);
  const [valueAtRisk, setValueAtRisk] = useState<number>(0);
  var title = period ? 'Returns (%) after ' + period + ' days. Value at risk: ' + valueAtRisk : 'Returns (%) with value at risk after a given period.'
  var monthly_returns_title = 'Monthly returns (%)'
  function handleStartCalculate(event: any) {
    event.preventDefault()
    userAuth.currentUser?.getIdToken().then(idToken => {
      fetch(process.env.REACT_APP_BACK_URL + '/api/value_at_risk',
        {
          method: 'POST',
          body: JSON.stringify({
            id_token: idToken,
            stock_list: stockList, 
            period: period,
            alpha: alpha,
            start_date: startDate,
            end_date: endDate
          }), // input tag name is stockname
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include'
        }
      )
      .then(res => {
        return res.json()
      })
      .then(res => {
        setPnlDist(res.data.pnl_dist);
        setValueAtRisk(res.data.var);
        setReturns(res.data.returns);
        setMonthlyReturns(res.data.monthly_returns);
        setDates(res.data.dates);
        setMonthlyReturnsDates(res.data.monthly_returns_dates);
        setBinMax(res.data.bin_max)
      })
      .catch(err => console.error(err));
    })
  }
  const layoutReturns = {
    shapes: [ // value at risk vertical line
        {
          type: 'line',
          x0: dates[0],
          y0: valueAtRisk,
          x1: dates[dates.length - 1],
          y1: valueAtRisk,
          line: {
            color: 'rgb(255, 0, 0)',
            width: 1,
          }
      } as any
    ],
    title: {text: title}
  }
  const layoutMonthlyReturns = {
    shapes: [ // value at risk vertical line
        {
          type: 'line',
          x0: monthlyReturnsDates[0],
          y0: valueAtRisk,
          x1: monthlyReturnsDates[monthlyReturnsDates.length - 1],
          y1: valueAtRisk,
          line: {
            color: 'rgb(255, 0, 0)',
            width: 1,
          }
      } as any
    ],
    title: {text: monthly_returns_title}
  }
  return (
    <div>
      <PortFolioValueAtRiskCalculation handleCalculateHook={handleStartCalculate}/>
      <HistogramPnL pnlDist={pnlDist} valueAtRisk={valueAtRisk} binMax={binMax}/>
      <BarChartReturn dates={dates} returns={returns} layout={layoutReturns}/>
      <BarChartReturn dates={monthlyReturnsDates} returns={monthlyReturns} layout={layoutMonthlyReturns}/>
    </div>
  )
}

type InputPortfolioValueAtRiskCalculation = {
  handleCalculateHook: any
}

function PortFolioValueAtRiskCalculation({handleCalculateHook}: InputPortfolioValueAtRiskCalculation) {
  return (
    <div className='portfolio-value-at-risk-calculation'>
      <button onClick={handleCalculateHook}>Optimize</button>
    </div>
  )
}

type InputPortfolioOptimCalculation = {
  handleCalculateHook: any
}

function PortfolioOptimCalculation({handleCalculateHook}: InputPortfolioOptimCalculation) {
  return (
    <div className='portfolio-optim-calculation'>
      <button onClick={handleCalculateHook}>Optimize</button>
    </div>
  )
}

type OptimalPortfolio = {
  distribution: string[],
  return: number[],
  volatility: number[],
  sharpe_ratio: number[],
}

type InputHistogramPnL = {
  pnlDist: number[]
  valueAtRisk: number
  binMax: number
}

function HistogramPnL({pnlDist, valueAtRisk, binMax}: InputHistogramPnL) {
  var pnlDistGraph = {
    x: pnlDist,
    type: 'histogram' as any,
    xbins: {
      size: (Math.max(...pnlDist) - Math.min(...pnlDist)) / 100
    }
  }
  const layout = {
    shapes: [ // value at risk vertical line
        {
          type: 'line',
          x0: valueAtRisk,
          y0: 0,
          x1: valueAtRisk,
          y1: binMax,
          line: {
            color: 'rgb(255, 0, 0)',
            width: 1,
          }
      } as any
    ],
    title: {text: 'Distribution of profit and losses.'}
  }
  return (
    <Plot data={[pnlDistGraph]} layout={layout}/> //https://stackoverflow.com/questions/77079200/plotly-does-not-know-bar-type-in-react-js-with-typescript?newreg=71bd5cda7d0044d6b5d1dbf555ce7878
  )
}

type InputBarChartReturn = {
  dates: string[]
  returns: number[]
  layout: any
}

function BarChartReturn({dates, returns, layout}: InputBarChartReturn) {
  var data = {
    x: dates,
    y: returns,
    type: 'bar' as any,
  }
  return (
    <Plot data={[data]} layout={layout}/> //https://stackoverflow.com/questions/77079200/plotly-does-not-know-bar-type-in-react-js-with-typescript?newreg=71bd5cda7d0044d6b5d1dbf555ce7878
  )
}

type InputScatterPlot = {
  result: string,
  returnVals: number[],
  volatilityVals: number[],
  sharpeRatioVals: number[],
  optimalPortfolio: OptimalPortfolio,
  distributionsPortfolio: string[],
}

function ScatterPlot({result, returnVals, volatilityVals, sharpeRatioVals, optimalPortfolio, distributionsPortfolio}: InputScatterPlot) {
  var trace1 = {
    y: returnVals,
    x: volatilityVals,
    mode: 'markers',
    marker: {
      size: 5,
      color: sharpeRatioVals,
      colorscale: 'YlOrRd',
    },
    text: distributionsPortfolio,
  };
  var trace2 = {
    y: optimalPortfolio.return,
    x: optimalPortfolio.volatility,
    mode: 'markers',
    marker: {
      size: 10,
      color: optimalPortfolio.sharpe_ratio,
    },
    text: optimalPortfolio.distribution,
  };
  const title = result ? 'Volatility return and Sharpe ratio, ' + result : 'Volatility return and Sharpe ratio'
  return (
    <Plot
      data={[trace1, trace2]}
      layout={ {width: 800, height: 400, title: {text: title}} }
    />

  );
}

type StockNameInput = {
  names: StockName[]
}

type StockNameWeight = {
  name: string,
  weight: string,
}

type StockNameInputWeight = {
  names: StockNameWeight[]
}

function StockNameList({stockList, hook}: any) {
  let content;
  content = stockList.names?.map((stock: StockName) => // For each line name create a Line object to be put in the LineChart object.
    <li><button onClick={hook} className='stock-name-button'>{stock.name}</button></li>
  )
  return (
    <div className='wrapper-stock-buttons'>
      <ul className="stock-buttons">
        {content}
      </ul>
    </div>
  )
}

function StockNameListWithWeight({stockList, hook, weightHook}: any) {
  let content;
  content = stockList.names?.map((stock: StockName) => // For each line name create a Line object to be put in the LineChart object.
    <li>
      <button onClick={hook} className='stock-name-button'>{stock.name}</button>
      <input type='number' step='0.01' onChange={weightHook} name={stock.name} max="1"></input>
    </li>
  )
  return (
    <div className='wrapper-stock-buttons'>
      <ul className="stock-buttons">
        {content}
      </ul>
    </div>
  )
}


function FakeComp2() {
  return (
    <div>
      Fake Comp 2
    </div>
  )
}


function LoginForm() {
  function handleConnectionViewEvent(event: any) {
    event.preventDefault()
    const email = event.target.elements.email.value;
    const password = event.target.elements.password.value;
    if (email.length < 4) {
      alert('Please enter an email address.');
      return;
    }
    if (password.length < 4) {
      alert('Please enter a password.');
      return;
    }
    if (event.nativeEvent.submitter.name === 'signin') {
      // Sign in with email and pass.
      signInWithEmailAndPassword(userAuth, email, password).then(function (userCreds) {
        userAuth.currentUser?.getIdToken(true).then((token) => {
          document.cookie = "token=" + token; // The token will be sent to the backend when needed.
        })
      }).catch(function (error) {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        if (errorCode === 'auth/wrong-password') {
          alert('Wrong password.');
        } else {
          alert(errorMessage);
        }
        console.log(error);
        return;
      });
    } else {
      createUserWithEmailAndPassword(userAuth, email, password).then((userCreds) => {
        userAuth.currentUser?.getIdToken(true).then((token) => {
          document.cookie = "token=" + token;
        })
      }).catch(function (error) {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;
        if (errorCode === 'auth/weak-password') {
          alert('The password is too weak.');
        } else {
          alert(errorMessage);
        }
        console.log(error);
        return;
      });
    }
  }
  return (
    <div className="login-form">
      <form onSubmit={handleConnectionViewEvent}>
        <input
          className="form-email"
          type="text"
          id="email"
          name="email"
          placeholder="Email"
        />
        <input
          className="form-password"
          type="password"
          id="password"
          name="password"
          placeholder="Password"
        />
        <button className="signin-button" name="signin">
          Sign In
        </button>
        <button className="signup-button" name="signup">
          Sign Up
        </button>
      </form>
    </div>
  )
}



class App extends React.Component {
  render() {
    return (
    <>
      <LoginPage/>
    </>
  );
  }
}


export default App;
