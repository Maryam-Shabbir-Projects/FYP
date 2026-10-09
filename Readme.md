# run
npm install
node server.js
or
npm run dev

npm install nodemailer (for provider signup verification)
check on (http://localhost:5000/)

# firebase
https://console.firebase.google.com/u/2/project/hostel-finder-e4aef
 -> firestore
 ->authentication
 password added -> 123456

 # Routes

GET     /my/list             (Get all hostels added by the logged-in provider)
GET     /pending/list        (Get all pending hostels for admin)
PATCH   /approve/:id         (Admin approves a hostel)
PATCH   /approve-edit/:id   (Admin approves a hostel edit request)

POST    /                     (Add/create a new hostel)
GET     /                     (Get all hostels)
GET     /:id                  (Get a single hostel by ID)
PUT     /:id                  (Update a hostel)
DELETE  /:id                  (Delete a hostel)


### Grouped by purpose

# Provider:

GET /my/list    (Provider's own hostels)

# Admin:

GET   /pending/list       (View pending hostels)
PATCH /approve/:id        (Approve hostel)
PATCH /approve-edit/:id   (Approve hostel edit)


# General CRUD:

POST   /       (Create hostel)
GET    /       (Get all hostels)
GET    /:id    (Get hostel by ID)
PUT    /:id    (Update hostel)
DELETE /:id    (Delete hostel)

GET     http://localhost:5000/hostels/my/list
        (Get all hostels belonging to the provider)

GET     http://localhost:5000/hostels/pending/list
        (Get all pending hostels for admin)

PATCH   http://localhost:5000/hostels/approve/:id
        (Approve a hostel — Admin)

PATCH   http://localhost:5000/hostels/approve-edit/:id
        (Approve a hostel edit request — Admin)

POST    http://localhost:5000/hostels/
        (Create/Add a new hostel)

GET     http://localhost:5000/hostels/
        (Get all hostels)

GET     http://localhost:5000/hostels/:id
        (Get a specific hostel by ID)

PUT     http://localhost:5000/hostels/:id
        (Update a hostel)

DELETE  http://localhost:5000/hostels/:id
        (Delete a hostel)

GET     http://localhost:5000/
        (Check if backend is running — No login required)

# for git
git status
git add config/firebase.js .gitignore
git commit -m "Update Firebase configuration"
git push origin main