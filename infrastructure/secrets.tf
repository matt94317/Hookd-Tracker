# Stores all your .env values in one secret
# ECS containers pull individual keys from this at startup
resource "aws_secretsmanager_secret" "app" {
  name        = "${var.app_name}/production"
  description = "All environment secrets for Hookd production"
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    DATABASE_URL            = "postgresql://hookd:${var.db_password}@${aws_db_instance.postgres.address}:5432/hookd_tracker"
    INSTAGRAM_APP_ID        = var.instagram_app_id
    INSTAGRAM_APP_SECRET    = var.instagram_app_secret
    TIKTOK_CLIENT_KEY       = var.tiktok_client_key
    TIKTOK_CLIENT_SECRET    = var.tiktok_client_secret
    TOKEN_ENCRYPTION_KEY    = var.token_encryption_key
    STRIPE_SECRET_KEY       = var.stripe_secret_key
    STRIPE_WEBHOOK_SECRET   = var.stripe_webhook_secret
    STRIPE_STARTER_PRICE_ID = var.stripe_starter_price_id
    STRIPE_PRO_PRICE_ID     = var.stripe_pro_price_id
    OAUTH_REDIRECT_BASE_URL = var.oauth_redirect_base_url
    FRONTEND_URL            = var.frontend_url
  })
}
