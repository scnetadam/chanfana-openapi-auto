# ========================================
# 龟钮印信 X402 COS + CAM 角色一键部署
# 使用方式：
#   1. 复制 terraform.tfvars.example 为 terraform.tfvars
#   2. 填入您的 SecretId 和 SecretKey
#   3. 执行 terraform init && terraform apply
#   4. 复制输出的 role_arn 回填到龟钮印信平台
# ========================================

terraform {
  required_providers {
    tencentcloud = {
      source  = "tencentcloudstack/tencentcloud"
      version = "~> 1.81"
    }
  }
}

provider "tencentcloud" {
  secret_id  = var.secret_id
  secret_key = var.secret_key
  region     = var.region
}

variable "secret_id" {
  description = "腾讯云 SecretId"
  type        = string
  sensitive   = true
}

variable "secret_key" {
  description = "腾讯云 SecretKey"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "COS 区域"
  type        = string
  default     = "ap-guangzhou"
}

variable "user_slug" {
  description = "用户标识(用于资源命名)"
  type        = string
  default     = "demo"
}

# ====== 1. 创建 COS 存储桶 ======
resource "tencentcloud_cos_bucket" "kol_bucket" {
  bucket = "x402-kol-${var.user_slug}"

  tags = {
    Project   = "x402-guiniu"
    ManagedBy = "terraform"
    UserId    = var.user_slug
  }
}

# ====== 2. 创建 CAM 策略(最小COS权限) ======
resource "tencentcloud_cam_policy" "cos_access_policy" {
  name        = "x402-kol-cos-access-${var.user_slug}"
  description = "X402 KOL COS access policy for user ${var.user_slug}"

  document = jsonencode({
    version = "2.0"
    statement = [
      {
        effect   = "allow"
        action   = [
          "cos:PutObject",
          "cos:GetObject",
          "cos:DeleteObject",
          "cos:ListBucket",
          "cos:HeadObject",
          "cos:PutObjectAcl"
        ]
        resource = [
          "qcs::cos::uid/*:x402-kol-${var.user_slug}/*",
          "qcs::cos::uid/*:x402-kol-${var.user_slug}"
        ]
      }
    ]
  })
}

# ====== 3. 创建 CAM 角色 ======
resource "tencentcloud_cam_role" "cos_role" {
  name        = "x402-kol-cos-role-${var.user_slug}"
  description = "X402 KOL COS access role"
  document    = jsonencode({
    version = "2.0"
    statement = [
      {
        effect    = "allow"
        principal = {
          service = "cos.tencentcloudapi.com"
        }
        action = "sts:AssumeRole"
      }
    ]
  })
}

# ====== 4. 绑定策略到角色 ======
resource "tencentcloud_cam_role_policy_attachment" "cos_role_policy" {
  role_id   = tencentcloud_cam_role.cos_role.id
  policy_id = tencentcloud_cam_policy.cos_access_policy.id
}

# ====== 输出 ======
output "bucket_name" {
  value = tencentcloud_cos_bucket.kol_bucket.bucket
}

output "role_arn" {
  description = "CAM 角色 ARN，请复制此值回填到龟钮印信平台"
  value       = "qcs::cam::uin/${var.user_slug}:roleName/${tencentcloud_cam_role.cos_role.name}"
}

output "cos_region" {
  value = var.region
}
