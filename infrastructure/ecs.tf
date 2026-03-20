resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-cluster"
}

# --- Backend Task Definition ---
# Defines the Flask container: image, ports, env vars, secrets, and logs
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.app_name}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${aws_ecr_repository.backend.repository_url}:latest"

    portMappings = [{
      containerPort = 5000
      protocol      = "tcp"
    }]

    environment = [
      { name = "FLASK_APP",   value = "app" },
      { name = "FLASK_DEBUG", value = "0" }
    ]

    # Each secret is pulled from Secrets Manager at container startup
    # Format: "<SECRET_ARN>:<JSON_KEY>::"
    secrets = [
      { name = "DATABASE_URL",            valueFrom = "${aws_secretsmanager_secret.app.arn}:DATABASE_URL::" },
      { name = "INSTAGRAM_APP_ID",        valueFrom = "${aws_secretsmanager_secret.app.arn}:INSTAGRAM_APP_ID::" },
      { name = "INSTAGRAM_APP_SECRET",    valueFrom = "${aws_secretsmanager_secret.app.arn}:INSTAGRAM_APP_SECRET::" },
      { name = "TIKTOK_CLIENT_KEY",       valueFrom = "${aws_secretsmanager_secret.app.arn}:TIKTOK_CLIENT_KEY::" },
      { name = "TIKTOK_CLIENT_SECRET",    valueFrom = "${aws_secretsmanager_secret.app.arn}:TIKTOK_CLIENT_SECRET::" },
      { name = "TOKEN_ENCRYPTION_KEY",    valueFrom = "${aws_secretsmanager_secret.app.arn}:TOKEN_ENCRYPTION_KEY::" },
      { name = "STRIPE_SECRET_KEY",       valueFrom = "${aws_secretsmanager_secret.app.arn}:STRIPE_SECRET_KEY::" },
      { name = "STRIPE_WEBHOOK_SECRET",   valueFrom = "${aws_secretsmanager_secret.app.arn}:STRIPE_WEBHOOK_SECRET::" },
      { name = "STRIPE_STARTER_PRICE_ID", valueFrom = "${aws_secretsmanager_secret.app.arn}:STRIPE_STARTER_PRICE_ID::" },
      { name = "STRIPE_PRO_PRICE_ID",     valueFrom = "${aws_secretsmanager_secret.app.arn}:STRIPE_PRO_PRICE_ID::" },
      { name = "OAUTH_REDIRECT_BASE_URL", valueFrom = "${aws_secretsmanager_secret.app.arn}:OAUTH_REDIRECT_BASE_URL::" },
      { name = "FRONTEND_URL",            valueFrom = "${aws_secretsmanager_secret.app.arn}:FRONTEND_URL::" }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

# --- Frontend Task Definition ---
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.app_name}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "frontend"
    image = "${aws_ecr_repository.frontend.repository_url}:latest"

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

# --- Backend ECS Service ---
# Keeps 1 backend container running and connects it to the ALB
resource "aws_ecs_service" "backend" {
  name            = "${var.app_name}-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true # needed to pull images from ECR in public subnets
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 5000
  }

  depends_on = [aws_lb_listener.http]
}

# --- Frontend ECS Service ---
resource "aws_ecs_service" "frontend" {
  name            = "${var.app_name}-frontend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.http]
}
