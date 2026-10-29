# Coffeebreak Volunteer Support

Free pink Coffeebreak web app that matches caring volunteers with people, carers and families who want a hand outside the NDIS. Mainly Newcastle and the Hunter, open anywhere in Australia.

- Static site: index.html, app.js, style.css, config.js. No build step, no tracking, no PayPal.
- Sign-ups, messages and contact details are stored in the visitor's own browser (localStorage).
- Listings approved by Coffeebreak can also be shown from Sanity project 8chc6tjv, dataset production (read-only, public fields only: first name, suburb, state, help types, availability, self-declared checks, short note). Document type `cbvListing` with `approved: true`. Never put contact details in the production dataset.

© Karen O'Brien (Coffeebreak). Karen O'Brien keeps all rights to this app, its design, name and logo. No copying. Third-party brands named belong to their owners. Not affiliated with the NDIS or NDIA.

## Checks and sponsorship (v1.1)
- Volunteers must give a WWCC number and expiry, a police check date and a police certificate file (PDF or image, up to 5 MB) to be listed. The file is kept in this browser's IndexedDB only and is never uploaded. Volunteer listings show "Checks provided (not yet verified by Coffeebreak)", and the WWCC number and expiry are only shown after both people agree to share contacts.
- The shared board query only shows volunteers with `checksProvided == true`.
- The Checks page covers the National Police Check, the NSW WWCC (free for volunteers) and how to verify through the OCG.
- Sponsor & Fund Us: tiers, one-off or monthly, PayID only. Business sponsor logos are added to the wall by hand.
