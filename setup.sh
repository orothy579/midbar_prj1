#!/bin/bash

set -e

LOGFILE = "/home/$(whoami)/setup.log"
echo " auto installation started: $(date)" | tee -a $LOGFILE

# 현재 로그인한 사용자 감지
USERNAE=$(whoami)
echo "$USERNAME" | tee -a $LOGFILE

# 사용자 sudo 권한 추가
echo " $USERNAME user has appended to sudo group... " | tee -a $LOGFILE
sudo usermod -aG sudo "$USERNAME"

# 패키지 업데이트
echo "system update and install the packages..." | tee -a $LOGFILE
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt install -y git wget unzip nodejs npm

# thingsboard 설치
echo "thingsboard installation..." | tee -a $LOGFILE
sudo apt install openjdk-17-jdk
sudo update-alternatives --config java
wget https://github.com/thingsboard/thingsboard/releases/download/v3.9.1/thingsboard-3.9.1.deb
sudo dpkg -i thingsboard-3.9.1.deb

# postgresql 설치
echo "postgresql installation..." | tee -a $LOGFILE
# install **wget** if not already installed:
sudo apt install -y wget

# import the repository signing key:
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# add repository contents to your system:
echo "deb https://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee  /etc/apt/sources.list.d/pgdg.list

# install and launch the postgresql service:
sudo apt update
sudo apt -y install postgresql
sudo service postgresql start

# PostgreSQL 기본 사용자 비밀번호 설정 (자동 입력)
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '1234';"

# ThingsBoard 데이터베이스 생성
sudo -u postgres psql -U postgres -d postgres -h 127.0.0.1 -W <<EOF
CREATE DATABASE thingsboard;
\q
EOF
echo "thingsboard database created..." | tee -a $LOGFILE

# ThingsBoard configuration
echo "ThingsBoard configuration..." | tee -a $LOGFILE
CONFIG_FILE="/etc/thingsboard/conf/thingsboard.conf"

sudo tee $CONFIG_FILE > /dev/null <<EOF
# DB Configuration
export DATABASE_TS_TYPE=sql
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/thingsboard
export SPRING_DATASOURCE_USERNAME=postgres
export SPRING_DATASOURCE_PASSWORD=1234
# Specify partitioning size for timestamp key-value storage. Allowed values: DAYS, MONTHS, YEARS, INDEFINITE.
export SQL_POSTGRES_TS_KV_PARTITIONING=MONTHS
# Update ThingsBoard memory usage and restrict it to 2G in /etc/thingsboard/conf/thingsboard.conf
export JAVA_OPTS="$JAVA_OPTS -Xms2G -Xmx2G"
EOF

sudo /usr/share/thingsboard/bin/install/install.sh --loadDemo

sudo service thingsboard start

echo "ThingsBoard installation completed..." | tee -a $LOGFILE

# ----------------------------
# modbus source 코드 다운로드
INSTALL_DIR="~/$USER/modbus"
DIST_DIR="https://github.com/orothy579/midbar_prj1/releases/latest/download/dist.zip"

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
wget -O dist.zip $DIST_DIR
unzip dist.zip
rm dist.zip  # 압축 해제 후 zip 파일 삭제

#socat 으로 가상 시리얼 포트 생성 및 권한 설정
echo "socat virtual serial port creation..." | tee -a $LOGFILE
sudo apt install -y socat
sudo socat pty,raw,echo=0,link=/dev/ttyV0 pty,raw,echo=0,link=/dev/ttyV1
sudo chmod 777 /dev/ttyV*


# PM2 설치 및 실행 설정
echo "PM2 설치 및 실행..."
sudo npm install -g pm2
pm2 start "$INSTALL_DIR/dist/modbus.js"
pm2 save
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USERNAME --hp /home/$USERNAME

echo "✅ auto installation completed: $(date)" | tee -a $LOGFILE