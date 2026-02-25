# PeraCom - DECP

### Department Engagement & Career Platform (DECP) for PeraCom

### CO528 - Applied Software Architecture Project

## Overview

PeraCom's Department Engagement & Career Platform (DECP) is a comprehensive web application designed to facilitate communication, engagement, and career development for students and faculty within the PeraCom community. The platform offers features such as event management, job postings, mentorship programs, and a resource library to support the academic and professional growth of its users.

## Features

- **Event Management**: Users can create, manage, and RSVP to events such as workshops, seminars, and networking sessions.
- **Job Postings**: Employers can post job opportunities, and students can browse and apply for positions relevant to their field of study.
- **Mentorship Programs**: Connect students with faculty and industry professionals for guidance and support in their academic and career journeys.
- **Resource Library**: A collection of articles, videos, and other materials to help students enhance their skills and knowledge in various subjects.
- **User Profiles**: Users can create and customize their profiles to showcase their skills, experiences, and interests.
- **Notifications**: Stay updated with the latest events, job postings, and mentorship opportunities through real-time notifications.

## Technologies Used

## How to Run

1. Clone the repository:

   ```bash
   git clone https://github.com/cepdnaclk/PeraCom-DECP.git
   ```

2. Navigate to the project directory:

   ```bash
    cd PeraCom-DECP
   ```

3. Start the application using Docker Compose:

   ```bash
    docker-compose up --build
   ```

   > Note: For development, you may use the command

   ```bash
   docker-compose up --build <service-name>
   ```

   ```bash
   // Example
   docker-compose up -d postgres mongo redis kafka minio kong prometheus grafana elasticsearch kibana otel-collector
   ```
