terraform {
  # 1.11+ for write-only arguments, which keep the DB password and JWT secret out of state.
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }

  # State is local by default. For a team, use S3 with native locking:
  # backend "s3" {
  #   bucket       = "<your-state-bucket>"
  #   key          = "orderflow/terraform.tfstate"
  #   region       = "ap-southeast-1"
  #   use_lockfile = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}
