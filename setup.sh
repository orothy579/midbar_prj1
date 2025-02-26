#!/bin/bash

set -e  # 에러 발생 시 즉시 종료

LOGFILE="/home/$(whoami)/setup.log"
echo "✅ Auto installation started: $(date)" | tee -a "$LOGFILE"

# 현재 로그인한 사용자 감지
USERNAME=$(whoami)
echo "User detected: $USERNAME" | tee -a "$LOGFILE"

# 사용자 sudo 권한 추가
echo "🔹 $USERNAME user has been added to the sudo group..." | tee -a "$LOGFILE"
sudo usermod -aG sudo "$USERNAME"

# 패키지 업데이트 및 필수 패키지 설치
echo "🔹 System update and install required packages..." | tee -a "$LOGFILE"
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt install -y git wget unzip nodejs npm openjdk-17-jdk socat

# ThingsBoard 설치
echo "🔹 ThingsBoard installation..." | tee -a "$LOGFILE"
wget https://github.com/thingsboard/thingsboard/releases/download/v3.9.1/thingsboard-3.9.1.deb
sudo dpkg -i thingsboard-3.9.1.deb

# PostgreSQL 설치
echo "🔹 PostgreSQL installation..." | tee -a "$LOGFILE"
sudo apt -y install postgresql
sudo service postgresql start

# PostgreSQL 기본 사용자 비밀번호 설정
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '1234';"

# ThingsBoard 데이터베이스 생성
sudo -u postgres psql -U postgres -d postgres -h 127.0.0.1 <<EOF
CREATE DATABASE thingsboard;
\q
EOF
echo "✅ ThingsBoard database created..." | tee -a "$LOGFILE"

# ThingsBoard 설정 파일 작성
echo "🔹 Configuring ThingsBoard..." | tee -a "$LOGFILE"
CONFIG_FILE="/etc/thingsboard/conf/thingsboard.conf"

sudo tee "$CONFIG_FILE" > /dev/null <<EOF
# DB Configuration
export DATABASE_TS_TYPE=sql
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/thingsboard
export SPRING_DATASOURCE_USERNAME=postgres
export SPRING_DATASOURCE_PASSWORD=1234
# Specify partitioning size for timestamp key-value storage. Allowed values: DAYS, MONTHS, YEARS, INDEFINITE.
export SQL_POSTGRES_TS_KV_PARTITIONING=MONTHS
# Update ThingsBoard memory usage and restrict it to 2G
export JAVA_OPTS="\$JAVA_OPTS -Xms2G -Xmx2G"
EOF

sudo /usr/share/thingsboard/bin/install/install.sh --loadDemo
sudo service thingsboard start

echo "✅ ThingsBoard installation completed..." | tee -a "$LOGFILE"

# Modbus 소스 코드 다운로드
INSTALL_DIR="$HOME/modbus"
DIST_URL="https://github.com/orothy579/midbar_prj1/releases/latest/download/dist.zip"

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
wget -O dist.zip "$DIST_URL"
unzip dist.zip
rm dist.zip  # 압축 해제 후 zip 파일 삭제

# socat으로 가상 시리얼 포트 생성 및 권한 설정
echo "🔹 Creating virtual serial port with socat..." | tee -a "$LOGFILE"
sudo socat pty,raw,echo=0,link=/dev/ttyV0 pty,raw,echo=0,link=/dev/ttyV1
sudo chmod 777 /dev/ttyV*

# PM2 설치 및 실행 설정
echo "🔹 Installing and configuring PM2..." | tee -a "$LOGFILE"
sudo npm install -g pm2
pm2 start "$INSTALL_DIR/dist/modbus.js"
pm2 save
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$USERNAME" --hp "/home/$USERNAME"

echo "✅ Auto installation completed: $(date)" | tee -a "$LOGFILE"
