# Digital Queue Management System

A single Spring Boot full-stack Java application for name-based token generation and FIFO queue management. The backend REST APIs, database layer, and browser UI are all served from one Java project.

## Syllabus Coverage

This project is designed to align with a typical full-stack Java course design by covering:

- Spring Boot application setup
- Layered architecture: controller, service, repository
- REST API development
- JPA/Hibernate entity mapping
- H2 database configuration
- Input validation and exception handling
- Frontend integration using HTML, CSS, and JavaScript
- Client-server communication with Fetch API
- Real-time style updates using polling
- Unit testing with JUnit and Mockito

I could not extract the attached PDF text in this terminal environment, so this mapping is based on the project brief and common full-stack Java syllabus expectations.

## Project Structure

```text
full_stack/
├── backend/
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/queue/digitalqueue/
│       │   │   ├── config/
│       │   │   ├── controller/
│       │   │   ├── dto/
│       │   │   ├── entity/
│       │   │   ├── exception/
│       │   │   ├── repository/
│       │   │   └── service/
│       │   └── resources/
│       │       ├── application.properties
│       │       └── static/
│       │           ├── admin.html
│       │           ├── admin.js
│       │           ├── index.html
│       │           ├── script.js
│       │           └── styles.css
│       └── test/
│           └── java/com/queue/digitalqueue/service/
│               └── TokenServiceImplTest.java
├── frontend/
└── README.md
```

## Architecture

- `TokenController`: REST endpoints for create, list, serve-next, reset, and queue status
- `ViewController`: lightweight MVC redirect for the admin page
- `TokenServiceImpl`: business logic for FIFO queue handling and token generation
- `TokenRepository`: Spring Data JPA repository for token persistence
- `Token`: JPA entity with `WAITING` and `SERVED` status
- `static/`: user and admin web pages served directly by Spring Boot

## API Endpoints

- `POST /api/tokens`
- `GET /api/tokens`
- `GET /api/tokens/status`
- `PUT /api/tokens/next`
- `DELETE /api/tokens/reset`

## Required Software

- Java 17+
- Maven 3.9+
- Browser

## How To Run

1. Open a terminal in [backend](c:/Users/Yaswanth%20Sunguluru/OneDrive/Desktop/veltech%20college/Full_stack/full_stack/backend).
2. Run:

```powershell
& "C:\Users\Yaswanth Sunguluru\Downloads\apache-maven-3.9.14-bin\apache-maven-3.9.14\bin\mvn.cmd" spring-boot:run
```

3. Open the application:
   - User page: `http://localhost:8080/`
   - Admin page: `http://localhost:8080/admin`
4. H2 console:
   - URL: `http://localhost:8080/h2-console`
   - JDBC URL: `jdbc:h2:mem:queuedb`
   - Username: `sa`
   - Password: leave blank

## How It Works

1. User enters a name and submits the form.
2. Spring Boot creates a unique incremental token with `WAITING` status.
3. Waiting tokens are displayed in FIFO order.
4. Admin serves the next token.
5. The earliest waiting token becomes `SERVED`.
6. User and admin pages poll every 4 seconds for updated queue information.

## Notes

- Everything now runs from the Java backend only
- No separate frontend server is required
- FIFO order is preserved by selecting the smallest waiting token number
- Reset clears the queue and restarts numbering from 1
