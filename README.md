# 📌 프로젝트: 유량 센서 데이터 관리 시스템

**프로젝트 시작일:** 2025-02-14  
**설명:**  
유량 센서 데이터를 읽고 저장하는 **Node.js 기반** 프로그램입니다.  
**Modbus RTU**를 사용하여 센서 데이터를 읽고, **MQTT**를 통해 퍼블리시하며,  
**PostgreSQL**을 이용해 데이터를 저장 및 관리합니다.
**hono**를 이용해 api-server를 만들어 데이터를 다운로드 할 수 있습니다.

---

## 🔧 **실행 환경**

- **하드웨어:** Raspberry Pi 5
- **운영체제:** Linux (Debian 기반)
- **개발 언어:** TypeScript
- **런타임:** Node.js

---

## 🏗 **기술 스택**

| 기술            | 설명                                             |
| --------------- | ------------------------------------------------ |
| **Node.js**     | 백엔드 실행 환경                                 |
| **TypeScript**  | 정적 타입 지원 개발 언어                         |
| **Modbus RTU**  | 센서 데이터 읽기 (Master, Slave 시뮬레이터 포함) |
| **MQTT**        | 데이터 전송 (IoT 메시지 브로커)                  |
| **PostgreSQL**  | 데이터 저장 및 관리                              |
| **Thingsboard** | 데이터 전체 관리                                 |
| **hono**        | csv 파일 다운로드 api-server 제공                |

---

## 🚀 **설치 및 실행 방법**

### **1️⃣ 환경 설정**

```sh
#setup.sh 실행
chmod +x setup.sh
ssh [username]@[hostname] "bash -s" < ./setup.sh

#.env 파일 생성하고 .env.sample을 참고하여 작성해주세요.

- ACCESS TOKEN 과 MQTT_BORKER_IP(hostname을 입력)을 적어주시면 됩니다.

# device를 만드세요.

# 실행 설정

pm2 start "node your_path/midbar_prj1/dist/modbus.js"
pm2 start "node your_path/midbar_prj1/dist/slave.js"
pm2 start "node your_path/midbar_prj1/dist/exportCsvApi.js"
pm2 save
pm2 startup

# things board에서 csv 파일 다운로드 받는 법

1. dashboard
2. button widget 생성
3. url 에 http://hostname:3000 입력
4. save

# grafana update 예정

```
