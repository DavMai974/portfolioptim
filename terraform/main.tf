provider "google" {
  project     = "YOUR_PROJECT_ID"
  region      = "eu-west1"
}


resource "google_app_engine_standard_app_version" "back" {
  version_id = "v1"
  service    = "back"
  runtime    = "python311"

  entrypoint {
    shell = "gunicorn -b :$PORT main:app"
  }

  deployment {
    zip {
      source_url = "https://storage.googleapis.com/YOUR_PROJECT_ID.appspot.com/${google_storage_bucket_object.object_back.name}"
    }
  }

  delete_service_on_destroy = true
}

resource "google_app_engine_standard_app_version" "front" {
  version_id = "v1"
  service    = "default"
  runtime    = "nodejs22"

  entrypoint {
    shell = "node ./app.js"
  }

  deployment {
    zip {
      source_url = "https://storage.googleapis.com/YOUR_PROJECT_ID.appspot.com/${google_storage_bucket_object.object_front.name}"
    }
  }

  delete_service_on_destroy = true
}

data "archive_file" "back" {
  type        = "zip"
  source_dir  = "../backend"
  output_path = "../backend/app.zip"
}

data "archive_file" "front" {
  type        = "zip"
  source_dir  = "../frontend"
  output_path = "../frontend/front.zip"
  excludes    = ["app.yaml", ".gitignore", ".gcloudignore", "main.py", "node_modules/*", "package-lock.json"]
}

resource "google_storage_bucket_object" "object_back" {
  name   = "app.zip"
  bucket = "YOUR_PROJECT_ID.appspot.com"
  source = data.archive_file.back.output_path
}

resource "google_storage_bucket_object" "object_front" {
  name   = "front.zip"
  bucket = "YOUR_PROJECT_ID.appspot.com"
  source = data.archive_file.front.output_path
}