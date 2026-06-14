# Kisan Manager

Kisan Manager is a mobile-friendly, offline-first farm and tractor business management application designed to help farmers and tractor service owners manage their daily work records, customer payments, labour details, and outstanding balances.

## Project Overview

Managing tractor work, customer dues, labour collections, and payments manually can become difficult and error-prone. Kisan Manager provides a simple digital solution that works on mobile devices and can also function without an internet connection.

The application stores data locally for offline usage and synchronizes records when an internet connection becomes available.

## Features

* Customer management
* Tractor work record tracking
* Old due and payment management
* Work-wise payment history
* Outstanding balance calculation
* Mirchi labour collection management
* Cotton labour collection management
* Search and customer filtering
* Offline support using IndexedDB
* Cloud synchronization using Firebase
* Installable Progressive Web App
* Mobile-responsive interface

## Technologies Used

* HTML5
* CSS3
* JavaScript
* Firebase Authentication
* Firebase Database
* IndexedDB
* Progressive Web App
* Service Worker
* Netlify

## Live Demo

[Open Kisan Manager](https://kisan-personal.netlify.app/)

## Project Structure

```text
Kisan_manager/
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── app.js
├── db.js
├── firebase-auth.js
├── firebase-config.js
├── firebase-sync.js
├── index.html
├── manifest.json
├── service-worker.js
├── style.css
├── .gitignore
└── README.md
```

## How to Run Locally

1. Clone the repository:

```bash
git clone https://github.com/adityasakarkar59/kisan-manager.git
```

2. Open the project folder in VS Code.

3. Open `index.html` using the Live Server extension.

## Future Improvements

* Add detailed business reports
* Add automatic data backup and restore
* Add PDF report generation
* Improve analytics and visual summaries
* Add multilingual support

## Author

**Aditya Sakarkar**

GitHub: [adityasakarkar59](https://github.com/adityasakarkar59)
