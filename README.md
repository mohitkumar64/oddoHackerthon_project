# TransitOps: Smart Transport Operations Platform
> **Hackathon Duration**: 8 Hours (SOLO Execution)  
> **Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, MongoDB, Mongoose, JWT Cookie Auth

TransitOps is a centralized transport operations platform designed to digitize vehicle registration, driver scheduling, cargo dispatching, compliance audits, workshop maintenance, and operational expense logs. It features four role-based dashboard consoles and strict server-side validation rules.

---

## Key Features

1. **Role-Based Access Control (RBAC) & Secure JWT Auth**:
   * Uses HTTP-only cookie-based JWT sessions.
   * Restricts layout access and endpoints according to roles (`ADMIN`, `FLEET_MANAGER`, `SAFETY_OFFICER`, `DRIVER`).
   * Implements secure middleware guarding `/dashboard` paths.

2. **Floating Demo Switcher Widget**:
   * A persistent dashboard control console enabling judges to swap roles (`Admin` ⇄ `Fleet Manager` ⇄ `Safety Officer` ⇄ `Driver`) instantly.
   * **Database Reseed & Reset Button**: Drops collections and seeds a preset of vehicles, drivers (including expired license and low safety rating anomalies), and financial logs in under 1 second.

3. **Fleet Manager Workspace**:
   * Complete vehicle, driver, and trip planners.
   * Available vehicle/driver select filters enforcing capacity and license compliance.
   * Visual Recharts analytics tracking vehicle return on investment (ROI) and cost segmentations.
   * Instant CSV exporter downloading expense logs.

4. **Live GPS Operations Map**:
   * A custom vector SVG map plotting routes (Chicago, Boston, Detroit, NY, Indianapolis, Cleveland).
   * Interpolates active trip coordinates, sliding truck nodes along active paths in real time.
   * Avoids external API key failures or script loading blockers.

5. **Driver Mobile Portal**:
   * Single-column, touch-optimized viewport.
   * Prompts for odometer and fuel completion logs when a trip is dispatched.
   * Quick expense loggers for tolls and unexpected charges.

6. **Safety & Compliance Console**:
   * Lists driver license category audits.
   * Highlights expired credentials in crimson red and soon-to-expire documents in amber yellow.
   * Roster switches for manual suspensions or corrective safety score edits.

7. **Workshop Maintenance Log**:
   * Places available vehicles in repair workshops (`IN_SHOP`), removing them from driver dispatch pools.
   * Automatically compiles invoice maintenance costs into vehicle expenses upon closure.

---

## System Architecture

```
📁 src/
├── 📁 app/
│   ├── 📁 api/                   # REST Route Controllers
│   │   ├── 📁 auth/              # JWT Login, Logout, Session, and DB Seeder
│   │   ├── 📁 vehicles/          # Vehicle CRUD & Detail ROI metrics
│   │   ├── 📁 drivers/           # Driver profiles & safety score updates
│   │   ├── 📁 trips/             # Trip Dispatch, Completion, Odometer locks
│   │   ├── 📁 maintenance/       # Maintenance work order controllers
│   │   └── 📁 expenses/          # Direct costs & fuel expense logs
│   ├── 📁 dashboard/             # Role guarded views
│   │   ├── 📁 admin/             # Overrides & Reset panel
│   │   ├── 📁 fleet-manager/     # Registries, Recharts, and Dispatches
│   │   ├── 📁 safety/            # License checks & safety ratings
│   │   ├── 📁 driver/            # Mobile console & completion logger
│   │   ├── 📄 layout.tsx         # Dashboard Frame & Header session
│   │   └── 📄 page.tsx           # Dashboard home router
│   ├── 📄 layout.tsx             # Theme & font shell
│   └── 📄 page.tsx               # Notion-style login portal
├── 📁 components/
│   ├── 📁 ui/                    # shadcn/ui primitives
│   ├── 📄 demo-switcher.tsx      # Floating judge panel
│   └── 📄 gps-map.tsx            # SVG GPS live route animator
├── 📁 lib/
│   ├── 📄 db.ts                  # Persistent Mongoose connection pool
│   ├── 📄 jwt.ts                 # JWT signing & decoding helpers
│   └── 📄 validations.ts         # Shared Zod validation schemas
└── 📁 models/                    # Mongoose MongoDB models
    ├── 📄 User.ts
    ├── 📄 Vehicle.ts
    ├── 📄 Driver.ts
    ├── 📄 Trip.ts
    ├── 📄 MaintenanceLog.ts
    └── 📄 Expense.ts
```

---

## Server-Side Business Validation Rules

TransitOps enforces these rules server-side to guarantee operational integrity:

* **Cargo Load Validator**: Compares cargo weights against vehicle capacities. Rejects trip creation if `cargoWeight > maxLoadCapacity`.
* **Roster Expiry Audit**: Refuses to dispatch trips if the assigned driver's license is expired.
* **Suspension Block**: Rejects dispatches if the target driver status is set to `SUSPENDED`.
* **Double Booking Prevention**: Enforces that both the vehicle and driver status must be `AVAILABLE` before dispatch. Changes both to `ON_TRIP` atomically upon dispatch.
* **Odometer Integrity**: Requires `finalOdometer >= vehicle.odometer` upon completion. Rejects trip completions if odometer logs run backward, and advances the vehicle's base odometer upon submit.
* **Maintenance Safety Lock**: Set vehicle status to `IN_SHOP` on open logs. Closed logs restore the vehicle to `AVAILABLE` (unless manually marked `RETIRED`).
* **Financial Calculations**:
  * `Fuel Efficiency = Planned Distance / Fuel Liters`
  * `Vehicle ROI = (Trip Revenue - Cumulative Expenses) / Vehicle Acquisition Cost`
  * `Operational Cost = Fuel costs + Maintenance costs + Tolls`

---

## Installation & Setup

### 1. Prerequisites
- **Node.js**: v20 or higher.
- **MongoDB**: Running locally (`mongodb://127.0.0.1:27017/transitops`) or a MongoDB Atlas URI string.

### 2. Environment Variables
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/transitops
JWT_SECRET=your-secret-key-phrase
```

### 3. Installation
Install project packages:
```bash
npm install
```

### 4. Run Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Pre-Configured Demo Credentials

Use the floating **Demo Console** in the bottom-right corner to reset the database and swap roles in 1 click, or sign in manually with these default credentials:

* **Fleet Manager**: `manager@transitops.com` / `password123`
* **Driver (John)**: `driver@transitops.com` / `password123`
* **Safety Officer**: `safety@transitops.com` / `password123`
* **Admin**: `admin@transitops.com` / `password123`
