# Prerequesites

* Google Cloud platform account in which you must enable app engine and firebase (frontend authentication with firebase sdk).
* terraform installed
* nodejs 22
* python 3.11

# Configure the frontend for firebase authentication

In App.tsx add your firebase config and call it firebaseConfig.  
As of today to find this config you have to go to the firebase console at home page, select the google cloud project  
on which you want the app to be, then select the firebase app of the project or create one.
In .env file, replace YOUR_PROJECT_ID.

# Configure the backend for your google cloud project

# Create infrastructure with terraform

terraform init
terraform apply

# CI/CD

# Clean up

terraform destroy