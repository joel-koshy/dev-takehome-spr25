# Checklist

<!-- Make sure you fill out this checklist with what you've done before submitting! -->

- [x] Read the README [please please please]
- [x] Something cool!
- [x] Back-end
  - [x] Minimum Requirements
    - [x] Setup MongoDB database
    - [x] Setup item requests collection
    - [x] `PUT /api/request`
    - [x] `GET /api/request?page=_`
  - [x] Main Requirements
    - [x] `GET /api/request?status=pending`
    - [x] `PATCH /api/request`
  - [x] Above and Beyond
    - [x] Batch edits
    - [x] Batch deletes
    - [x] Testing Database and Backedn Logic Tests
- [ ] Front-end
  - [ ] Minimum Requirements
    - [ ] Dropdown component
    - [ ] Table component
    - [ ] Base page [table with data]
    - [ ] Table dropdown interactivity
  - [ ] Main Requirements
    - [ ] Pagination
    - [ ] Tabs
  - [ ] Above and Beyond
    - [ ] Batch edits
    - [ ] Batch deletes

# Notes

<!-- Notes go here -->
## 1. API routes 

Some API routes have custom behaviors:
**PUT `/api/request`**
- Allows updating the status of an existing request.
- The request body should contain (status is optional):
```json 
{
  "requestorName": "John Doe",
  "itemRequested": "First Aid Kit",
  "status": "pending"
}
```

**Batch Edit**
- Accepts an array of edits:
-  Updates multiple requests in one call.
```json 
[
  { "id": "<mongodb-id>", "status": "APPROVED" },
  { "id": "<mongodb-id>", "status": "PENDING" }
]
```
**Delete**
- Accepts an array of IDs to delete 
```json
[
  { "id": "<mongodb-id>", "status": "APPROVED" },
  { "id": "<mongodb-id>", "status": "PENDING" }
]
```

>All IDs are based on MongoDB’s auto-generated ObjectIds.

Example Request calls are in req.http and batch.http. 

These requests may be called in VSCode if the Rest Client extension is installed. 

## 2. Project Setup and Usage
### 1. Install Dependencies
Install the project dependencies:
```bash
npm install
```

Install development dependencies for testing
```bash 
npm isntall --save-dev
```
### 2. Environment Variables 
- **`.env`** – used in development; requires:
```env
DB_URI=<srv-mongodb-uri>
```

- **`.env.test`** – used when running tests; requires:
```env.test
DB_URI=<non-srv-mongodb-uri>
```

- **`.env.local`** – used for 'something cool' page 
- ```env.local 
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-google-maps-api-key>
  ```
### 3. Running 
#### Dev Server : 
```bash 
npm run dev
```
#### Testing 
```bash 
npm run test
```

> Note: Tests are AI generated but manually reviewed for accuracy.
