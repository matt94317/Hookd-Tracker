variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name, used as a prefix for all resources"
  type        = string
  default     = "hookd-tracker"
}

variable "environment" {
  description = "Deployment environment (production, staging)"
  type        = string
  default     = "production"
}

# --- Database ---

variable "db_password" {
  description = "RDS PostgreSQL master password"
  type        = string
  sensitive   = true
}

# --- App Secrets (from your .env) ---

variable "instagram_app_id" {
  type      = string
  sensitive = true
}

variable "instagram_app_secret" {
  type      = string
  sensitive = true
}

variable "tiktok_client_key" {
  type      = string
  sensitive = true
}

variable "tiktok_client_secret" {
  type      = string
  sensitive = true
}

variable "token_encryption_key" {
  type      = string
  sensitive = true
}

variable "stripe_secret_key" {
  type      = string
  sensitive = true
}

variable "stripe_webhook_secret" {
  type      = string
  sensitive = true
}

variable "stripe_starter_price_id" {
  type = string
}

variable "stripe_pro_price_id" {
  type = string
}

variable "oauth_redirect_base_url" {
  description = "Base URL for OAuth callbacks (your ALB DNS or custom domain)"
  type        = string
}

variable "frontend_url" {
  description = "Frontend URL shown to users (your ALB DNS or custom domain)"
  type        = string
}
