# 📌 프로젝트: 유량 센서 데이터 관리 시스템

**프로젝트 시작일:** 2025-02-14  
**설명:**  
유량 센서 데이터를 읽고 저장하는 **Node.js 기반** 프로그램입니다.  
**Modbus RTU**를 사용하여 센서 데이터를 읽고, **MQTT**를 통해 퍼블리시하며,  
**PostgreSQL**을 이용해 데이터를 저장 및 관리합니다.

---

## 🔧 **실행 환경**

- **하드웨어:** Raspberry Pi 5
- **운영체제:** Linux (Debian 기반)
- **개발 언어:** TypeScript
- **런타임:** Node.js

---

## 🏗 **기술 스택**

| 기술           | 설명                                             |
| -------------- | ------------------------------------------------ |
| **Node.js**    | 백엔드 실행 환경                                 |
| **TypeScript** | 정적 타입 지원 개발 언어                         |
| **Modbus RTU** | 센서 데이터 읽기 (Master, Slave 시뮬레이터 포함) |
| **MQTT**       | 데이터 전송 (IoT 메시지 브로커)                  |
| **PostgreSQL** | 데이터 저장 및 관리                              |
| **Thingsboard** | 데이터 전체 관리 |

---

## 🚀 **설치 및 실행 방법**

### **1️⃣ 환경 설정**

#### **Node.js & TypeScript 설치**

```sh
sudo apt update && sudo apt install -y nodejs npm
npm install -g typescript ts-node
```
