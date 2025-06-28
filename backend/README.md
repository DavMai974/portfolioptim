# WARNING

1. verify_id_token:
This method has a problem when the server time is not sync with the client's time:
InvalidIdTokenError("Token used too early, 1748085066 < 1748085067. Check that your computer's clock is set correctly.")
In the PR they added the option clock_skew_seconds, and I use it but I dont know if its secure. 
There would be a better way to do it by synchronizing the server on app engine:
https://developers.google.com/time/guides?hl=fr (source: https://github.com/firebase/firebase-admin-python/issues/624#issuecomment-1605372897)