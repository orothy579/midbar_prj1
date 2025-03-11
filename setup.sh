# #!/bin/bash

set -e  # 에러 발생 시 즉시 종료
export DEBIAN_FRONTEND=noninteractive


LOGFILE="/home/$(whoami)/setup.log"
echo "✅ Auto installation started: $(date)" | tee -a "$LOGFILE"

USERNAME=$(whoami)
echo "User detected: $USERNAME" | tee -a "$LOGFILE"

# 사용자 sudo 권한 추가
echo "🔹 $USERNAME user has been added to the sudo group..." | tee -a "$LOGFILE"
sudo usermod -aG sudo "$USERNAME"

# 패키지 업데이트 및 필수 패키지 설치
echo "🔹 System update and install required packages..." | tee -a "$LOGFILE"
sudo apt-get update -y && sudo apt-get upgrade -y
sudo apt-get install -y git wget unzip npm openjdk-17-jdk socat vim



# ThingsBoard 설치
echo "🔹 ThingsBoard installation..." | tee -a "$LOGFILE"
sudo update-alternatives --auto java
wget https://github.com/thingsboard/thingsboard/releases/download/v3.9.1/thingsboard-3.9.1.deb
sudo dpkg -i thingsboard-3.9.1.deb

# PostgreSQL 설치
echo "🔹 PostgreSQL installation..." | tee -a "$LOGFILE"

sudo locale-gen en_GB.UTF-8
sudo update-locale LANG=en_GB.UTF-8 LANGUAGE=en_GB:en LC_ALL=en_GB.UTF-8

# 현재 세션에 로케일 설정 적용
export LANG=en_GB.UTF-8
export LANGUAGE=en_GB:en
export LC_ALL=en_GB.UTF-8

# import the repository signing key:
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# add repository contents to your system:
echo "deb https://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee  /etc/apt/sources.list.d/pgdg.list

# install and launch the postgresql service:
sudo apt update
sudo apt -y install postgresql
sudo service postgresql start

echo "Setting password for postgres user to 1234..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '1234';"

echo "Creating ThingsBoard database..."
sudo -u postgres psql -c "CREATE DATABASE thingsboard;"

echo "Creating modbus database..."
sudo -u postgres psql -c "CREATE DATABASE modbus;"

sudo -u postgres psql -d modbus -c "CREATE TABLE modbus_data(
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    data1 FLOAT,
    data2 FLOAT,
    data3 FLOAT
);"


echo "PostgreSQL initial setup complete."

echo "✅ ThingsBoard database created..." | tee -a "$LOGFILE"

# ThingsBoard 설정 파일 작성
echo "🔹 Configuring ThingsBoard..." | tee -a "$LOGFILE"
CONFIG_FILE="/etc/thingsboard/conf/thingsboard.conf"

# DB Configuration
sudo tee "$CONFIG_FILE" > /dev/null <<'EOF'
export DATABASE_TS_TYPE=sql
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/thingsboard
export SPRING_DATASOURCE_USERNAME=postgres
export SPRING_DATASOURCE_PASSWORD='1234'

# Specify partitioning size for timestamp key-value storage.
# Allowed values: DAYS, MONTHS, YEARS, INDEFINITE.
export SQL_POSTGRES_TS_KV_PARTITIONING=MONTHS

# Update ThingsBoard memory usage and restrict it to 2G
export JAVA_OPTS="$JAVA_OPTS -Xms2G -Xmx2G"
EOF

sudo /usr/share/thingsboard/bin/install/install.sh --loadDemo
sudo service thingsboard start

echo "✅ ThingsBoard installation completed..." | tee -a "$LOGFILE"


#Grafana setup
sudo apt-get install -y apt-transport-https software-properties-common wget
sudo mkdir -p /etc/apt/keyrings/
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list

# Updates the list of available packages
sudo apt-get update
# Installs the latest OSS release:
sudo apt-get install grafana -y
sudo systemctl daemon-reload
sudo systemctl start grafana-server
sudo systemctl enable grafana-server.service

echo "✅ grafana installation completed... " | tee -a "$LOGFILE"


sudo npm install -g pm2

curl -fsSL https://deb.nodesource.com/setup_current.x | sudo -E bash -
sudo apt-get install -y nodejs

# Node.js 및 npm 버전 확인
node -v  # 예상 출력: v22.x.x
npm -v   # 예상 출력: x.x.x


# Modbus 소스 코드 다운로드
INSTALL_DIR="/home/$(whoami)/modbus"
REPO_URL="https://github.com/orothy579/midbar_prj1.git"

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
git clone "$REPO_URL"
cd "$INSTALL_DIR/midbar_prj1"
sudo npm install

# socat으로 가상 시리얼 포트 생성 및 권한 설정
echo "🔹 Creating virtual serial port with socat..." | tee -a "$LOGFILE"
pm2 start "sudo socat -d -d pty,raw,echo=0,link=/dev/ttyV0 pty,raw,echo=0,link=/dev/ttyV1"
sudo chmod 777 /dev/ttyV*

echo "✅ Auto installation completed: $(date)" | tee -a "$LOGFILE"
