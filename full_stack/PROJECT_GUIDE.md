# Smart Digital Queue Management System

A startup-style full-stack Java application built with Spring Boot, H2, HTML, CSS, and JavaScript. The system supports smart queue routing, service-based lanes, priority tokens, live dashboards, notifications, and analytics in one runnable Java project.

## Key Features

- Smart queue with `NORMAL`, `VIP`, and `EMERGENCY` priorities
- Multi-service routing for `PAYMENT`, `ENQUIRY`, and `SUPPORT`
- Virtual queue joining with live browser tracking
- Estimated wait times and position in queue
- Near-turn popup alerts and sound notifications
- Admin controls for serve next, smart lane selection, pause, resume, and reset
- Analytics dashboard with trend charts and service load charts
- Dark mode toggle and responsive modern UI
- H2 database persistence during runtime
- Unit tests with JUnit and Mockito

## Main APIs

- `POST /api/tokens`
- `GET /api/tokens`
- `GET /api/tokens/current`
- `GET /api/tokens/status`
- `GET /api/tokens/dashboard`
- `PUT /api/tokens/next?serviceType=AUTO|PAYMENT|ENQUIRY|SUPPORT`
- `PUT /api/tokens/pause`
- `PUT /api/tokens/resume`
- `DELETE /api/tokens/reset`

## Run Command

```powershell
cd "C:\Users\Yaswanth Sunguluru\OneDrive\Desktop\veltech college\Full_stack\full_stack\backend"
Remove-Item Env:MAVEN_OPTS -ErrorAction SilentlyContinue
& "C:\Users\Yaswanth Sunguluru\Downloads\apache-maven-3.9.14-bin\apache-maven-3.9.14\bin\mvn.cmd" "-Dmaven.repo.local=C:\m2repo" spring-boot:run
```

## Open In Browser

- User UI: `http://localhost:8080/`
- Admin UI: `http://localhost:8080/admin`
- H2 Console: `http://localhost:8080/h2-console`

## H2 Settings

- JDBC URL: `jdbc:h2:mem:queuedb`
- Username: `sa`
- Password: leave blank

## Test Command

```powershell
cd "C:\Users\Yaswanth Sunguluru\OneDrive\Desktop\veltech college\Full_stack\full_stack\backend"
Remove-Item Env:MAVEN_OPTS -ErrorAction SilentlyContinue
& "C:\Users\Yaswanth Sunguluru\Downloads\apache-maven-3.9.14-bin\apache-maven-3.9.14\bin\mvn.cmd" "-Dmaven.repo.local=C:\m2repo" test
```
