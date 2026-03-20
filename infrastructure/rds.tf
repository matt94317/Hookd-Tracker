# RDS needs to know which subnets it can use (requires 2+ in different AZs)
resource "aws_db_subnet_group" "main" {
  name       = "${var.app_name}-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_db_instance" "postgres" {
  identifier     = "${var.app_name}-db"
  engine         = "postgres"
  engine_version = "15"

  instance_class    = "db.t3.micro" # free tier eligible
  allocated_storage = 20
  storage_type      = "gp2"

  db_name  = "hookd_tracker"
  username = "hookd"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible = false # only reachable from within the VPC

  backup_retention_period = 7    # keep 7 days of automated backups
  deletion_protection     = true # prevents accidental deletion via Terraform
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.app_name}-db-final-snapshot"
}
