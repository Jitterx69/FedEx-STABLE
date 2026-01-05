terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = ">= 2.20"
    }
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "FedEx-STABLE"
      ManagedBy   = "Terraform"
    }
  }
}

data "aws_availability_zones" "available" {}

# -----------------------------------------------------------------------------
# VPC
# -----------------------------------------------------------------------------
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "${var.cluster_name}-vpc"
  cidr = var.vpc_cidr

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = [for k, v in module.vpc.azs : cidrsubnet(var.vpc_cidr, 4, k)]
  public_subnets  = [for k, v in module.vpc.azs : cidrsubnet(var.vpc_cidr, 8, k + 48)]
  database_subnets = [for k, v in module.vpc.azs : cidrsubnet(var.vpc_cidr, 8, k + 52)]
  elasticache_subnets = [for k, v in module.vpc.azs : cidrsubnet(var.vpc_cidr, 8, k + 56)]

  enable_nat_gateway   = true
  single_nat_gateway   = true # For cost saving in non-prod, consider false for highly available prod
  enable_dns_hostnames = true

  # Tags required for EKS to auto-discover subnets
  public_subnet_tags = {
    "kubernetes.io/role/elb" = 1
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = 1
  }
}

# -----------------------------------------------------------------------------
# EKS Cluster
# -----------------------------------------------------------------------------
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.15.3"

  cluster_name    = var.cluster_name
  cluster_version = "1.29"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    general = {
      min_size     = 1
      max_size     = 3
      desired_size = 2

      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
    }
  }
}

# -----------------------------------------------------------------------------
# RDS (Postgres)
# -----------------------------------------------------------------------------
module "db" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.3.0"

  identifier = "${var.cluster_name}-postgres"

  engine               = "postgres"
  engine_version       = "16.1"
  family               = "postgres16"
  major_engine_version = "16"
  instance_class       = "db.t3.micro" # Affordable for dev/test

  allocated_storage     = 20
  max_allocated_storage = 100

  db_name  = "stable_core"
  username = var.db_username
  port     = 5432

  subnet_ids             = module.vpc.database_subnets
  vpc_security_group_ids = [module.security_group_db.security_group_id]

  maintenance_window      = "Mon:00:00-Mon:03:00"
  backup_window           = "03:00-06:00"
  backup_retention_period = 7
  
  # For production, set this to false
  skip_final_snapshot = true
}

module "security_group_db" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.0"

  name        = "${var.cluster_name}-db-sg"
  description = "PostgreSQL security group"
  vpc_id      = module.vpc.vpc_id

  # Allow ingress from EKS nodes
  ingress_with_cidr_blocks = [
    {
      from_port   = 5432
      to_port     = 5432
      protocol    = "tcp"
      description = "PostgreSQL access from within VPC"
      cidr_blocks = module.vpc.vpc_cidr_block
    },
  ]
}


# -----------------------------------------------------------------------------
# ElastiCache (Redis)
# -----------------------------------------------------------------------------
resource "aws_elasticache_subnet_group" "default" {
  name       = "${var.cluster_name}-redis-subnet-group"
  subnet_ids = module.vpc.elasticache_subnets
}

module "security_group_redis" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "5.1.0"

  name        = "${var.cluster_name}-redis-sg"
  description = "Redis security group"
  vpc_id      = module.vpc.vpc_id

  ingress_with_cidr_blocks = [
    {
      from_port   = 6379
      to_port     = 6379
      protocol    = "tcp"
      description = "Redis access from within VPC"
      cidr_blocks = module.vpc.vpc_cidr_block
    },
  ]
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.cluster_name}-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.1"
  port                 = 6379
  
  subnet_group_name    = aws_elasticache_subnet_group.default.name
  security_group_ids   = [module.security_group_redis.security_group_id]
}
