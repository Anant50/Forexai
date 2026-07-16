# ForexAI Pro - Multi-Cloud Deployment Guide

This guide details the exact steps required to provision the infrastructure and seamlessly deploy the ForexAI Pro Docker ecosystem on **Google Cloud Platform (GCP)**, **Amazon Web Services (AWS)**, and **Microsoft Azure**.

---

## 1. Amazon Web Services (AWS) Deployment

AWS provides robust infrastructure. We will target an **EC2 (Elastic Compute Cloud)** instance utilizing Ubuntu 24.04 LTS.

### Provisioning EC2
1. Log into AWS Console -> EC2 -> Launch Instance.
2. Select **Ubuntu Server 24.04 LTS (AMI)**.
3. Choose Instance Type: **t3.large** (Minimum 2 vCPUs, 8GB RAM required for ML/Vision models).
4. Storage: Provision **60 GB gp3 SSD** to prevent image exhaustion.
5. Create a new Key Pair (`forexai-key.pem`) and download it securely.
6. Configure Security Group boundaries:
   - Allow **TCP Port 22** (SSH).
   - Allow **TCP Port 80** (HTTP) from 0.0.0.0/0.
   - Allow **TCP Port 443** (HTTPS) from 0.0.0.0/0.
7. Launch the instance.

### Deployment Execution
Connect via SSH:
```bash
chmod 400 forexai-key.pem
ssh -i "forexai-key.pem" ubuntu@<aws-ec2-public-ip>
```
Once connected, clone your repository and execute our deployment script:
```bash
sudo apt update && sudo apt install docker.io docker-compose -y
git clone https://github.com/your-username/forexai-pro.git
cd forexai-pro
cp .env.production.example .env
# Edit .env substituting AWS RDS/S3 credentials explicitly
sudo ./deploy/deploy.sh
```

---

## 2. Google Cloud Platform (GCP) Deployment

GCP's networking structure requires explicit Firewall rule generation traversing the VPC logic dynamically.

### Provisioning Compute Engine
1. Log into GCP Console -> Compute Engine -> VM Instances -> Create Instance.
2. Region: `us-central1` (or local region of choice).
3. Machine Configuration: **e2-standard-2** (2 vCPU, 8 GB memory).
4. Boot Disk: **Ubuntu 22.04 LTS**, 60 GB Balanced Persistent Disk.
5. Identify the "Firewall" section and natively check:
   - Allow **HTTP traffic**
   - Allow **HTTPS traffic**
6. Click **Create**.

### Deployment Execution
Click the `SSH` button next to the instance in the GCP console to open a secure web terminal natively:
```bash
sudo apt-get update && sudo apt-get install docker.io docker-compose git -y
git clone https://github.com/your-username/forexai-pro.git
cd forexai-pro
cp .env.production.example .env
# Validate production variables
sudo ./deploy/deploy.sh
```

---

## 3. Microsoft Azure Deployment

Azure utilizes Virtual Machines bound strictly inside resource groups structurally parsing public IPs dynamically.

### Provisioning Virtual Machines
1. Log into Azure Portal -> Virtual Machines -> Create -> Azure Virtual Machine.
2. Resource Group: Create new strictly named `rg-forexai-prod`.
3. Virtual machine name: `vm-forexai-node`.
4. Image: **Ubuntu Server 24.04 LTS - x64 Gen2**.
5. Size: **Standard_B2ms** (2 vcpus, 8 GiB memory).
6. Administrator account: 
   - Authentication type: SSH public key.
   - Username: `azureuser`.
   - Download the generated private key.
7. Explicitly open **Port 80** and **Port 443** under inbound port rules natively!
8. Formally execute Review + Create.

### Deployment Execution
SSH into the Azure node traversing the dynamic IP limit:
```bash
chmod 400 azure-forexai.pem
ssh -i "azure-forexai.pem" azureuser@<azure-public-ip>
```
Pull and build the monolithic structures cleanly:
```bash
sudo apt update && sudo apt install docker-compose -y
git clone https://github.com/your-username/forexai-pro.git
cd forexai-pro
cp .env.production.example .env
sudo bash ./deploy/deploy.sh
```

---

## Final Production Validation
Regardless of the platform chosen above:
1. Verify Docker maps effectively: `sudo docker ps`
2. Obtain a Domain Name targeting the Cloud's Public IP globally.
3. SSH structurally back into the VM and execute Nginx SSL Certbot mappings dynamically parsing `nginx.conf`:
```bash
sudo docker run -it --rm --name certbot \
  -v "$(pwd)/deploy/nginx.conf:/etc/nginx/nginx.conf" \
  -v "certbot_www:/var/www/certbot" \
  -v "certbot_certs:/etc/letsencrypt" \
  certbot/certbot certonly --webroot -w /var/www/certbot -d yourdomain.com
```
