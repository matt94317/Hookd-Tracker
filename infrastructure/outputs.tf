output "alb_dns_name" {
  description = "Your app's public URL (point your domain here or use directly)"
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_backend_url" {
  description = "ECR backend repo URL — use in GitHub Actions secret ECR_BACKEND_REPO"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "ECR frontend repo URL — use in GitHub Actions secret ECR_FRONTEND_REPO"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name — use in GitHub Actions secret ECS_CLUSTER"
  value       = aws_ecs_cluster.main.name
}

output "ecs_backend_service_name" {
  description = "Backend service name — use in GitHub Actions secret ECS_BACKEND_SERVICE"
  value       = aws_ecs_service.backend.name
}

output "ecs_frontend_service_name" {
  description = "Frontend service name — use in GitHub Actions secret ECS_FRONTEND_SERVICE"
  value       = aws_ecs_service.frontend.name
}

output "rds_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.postgres.address
  sensitive   = true
}
