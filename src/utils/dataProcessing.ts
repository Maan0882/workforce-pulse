import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export interface ActivityLogRaw {
  employee_id: string;
  department: string;
  timestamp: string;
  app_used: string;
  task_category: string;
  duration_minutes: string;
  is_repetitive: string;
}

export interface ActivityLog {
  employeeId: string;
  department: string;
  timestamp: Date;
  appUsed: string;
  taskCategory: string;
  durationMinutes: number;
  isRepetitive: boolean;
  isValid: boolean;
}

export interface EmployeeRaw {
  EmployeeID?: string;
  employee_id?: string;
  Name?: string;
  name?: string;
  Dept?: string;
  department?: string;
  Role?: string;
  role?: string;
  meta?: { role?: string };
  salary_LPA?: number;
  salary_hourly_INR?: number;
  salary_INR_annual?: number;
  tenureMonths?: number;
  tenure?: number;
  workingHours?: string | { start: string; end: string } | null;
  working_hours?: string | { start: string; end: string } | null;
  Status?: string;
  status?: string;
  terminated_on?: string;
}

export interface Employee {
  employeeId: string;
  name: string;
  department: string;
  role: string;
  monthlySalaryINR: number;
  tenureMonths: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  status: string;
}

export interface JoinedData {
  activities: ActivityLog[];
  employees: Record<string, Employee>;
  logs: {
    droppedRows: number;
    fixedRows: number;
    flaggedRows: number;
    missingEmployees: Set<string>;
    extraEmployees: Set<string>;
  };
}

let cachedData: JoinedData | null = null;

function parseTimestampToIST(ts: string): Date | null {
  // Try to parse various formats:
  // "21/10/2025 14:44" (DD/MM/YYYY HH:mm)
  // "2025-10-08 13:46:09" (YYYY-MM-DD HH:mm:ss)
  // "2025-10-17T13:21:23" (ISO)
  if (!ts) return null;
  let date: Date;
  
  if (ts.includes('/')) {
    const [datePart, timePart] = ts.split(' ');
    const [day, month, year] = datePart.split('/');
    // Assuming IST is UTC+5:30. We'll just parse it as local time for now, 
    // but append +05:30 to treat it as IST.
    date = new Date(`${year}-${month}-${day}T${timePart}:00+05:30`);
  } else if (ts.includes('T')) {
    date = new Date(ts.endsWith('Z') || ts.includes('+') ? ts : `${ts}+05:30`);
  } else {
    // "2025-10-08 13:46:09"
    date = new Date(`${ts.replace(' ', 'T')}+05:30`);
  }
  
  return isNaN(date.getTime()) ? null : date;
}

function normalizeApp(app: string): string {
  if (!app) return 'unknown';
  app = app.toLowerCase().trim();
  if (app.includes('excel')) return 'excel';
  if (app.includes('outlook')) return 'outlook';
  if (app.includes('gmail')) return 'gmail';
  if (app.includes('slack')) return 'slack';
  if (app.includes('sap')) return 'sap';
  if (app.includes('zoho')) return 'zoho crm';
  if (app.includes('chrome')) return 'chrome';
  return app;
}

function normalizeCategory(category: string): string {
  if (!category) return 'unknown';
  category = category.toLowerCase().trim();
  if (category.includes('cal') || category.includes('calendar')) return 'calendar management';
  if (category.includes('internal comms') || category.includes('internal communication')) return 'internal communication';
  if (category.includes('status')) return 'status updates';
  if (category.includes('email triage')) return 'email triage';
  if (category.includes('reporting')) return 'reporting';
  if (category.includes('lead') && category.includes('entry')) return 'lead entry';
  if (category.includes('vendor portal')) return 'vendor portals';
  if (category.includes('client comm')) return 'client communication';
  if (category.includes('data-entry') || category.includes('data entry')) return 'data entry';
  if (category.includes('vendor m')) return 'vendor management';
  return category;
}

function normalizeBoolean(val: string): boolean {
  if (!val) return false;
  val = val.toLowerCase().trim();
  return ['true', '1', 'yes', 'y', 't'].includes(val);
}

export function getNormalizedData(): JoinedData {
  if (cachedData) return cachedData;

  const dataDir = path.join(process.cwd(), 'src', 'data');
  const activityCsvPath = path.join(dataDir, 'activity_logs.csv');
  const employeeJsonPath = path.join(dataDir, 'employees.json');

  const logs = {
    droppedRows: 0,
    fixedRows: 0,
    flaggedRows: 0,
    missingEmployees: new Set<string>(),
    extraEmployees: new Set<string>()
  };

  // --- Parse Employees ---
  const employeesRaw: { employees: EmployeeRaw[] } = JSON.parse(fs.readFileSync(employeeJsonPath, 'utf-8'));
  const employeesRecord: Record<string, Employee> = {};

  // Handle Duplicates & Normalization
  employeesRaw.employees.forEach(raw => {
    const id = (raw.EmployeeID || raw.employee_id || '').trim();
    if (!id) return;

    let monthlySalaryINR = 0;
    if (raw.salary_LPA) {
      monthlySalaryINR = (raw.salary_LPA * 100000) / 12;
    } else if (raw.salary_INR_annual) {
      monthlySalaryINR = raw.salary_INR_annual / 12;
    } else if (raw.salary_hourly_INR) {
      // Assuming 160 hours a month
      monthlySalaryINR = raw.salary_hourly_INR * 160;
    }

    const workingHours = raw.workingHours || raw.working_hours;
    let whStart = '09:00';
    let whEnd = '17:00'; // Default
    if (typeof workingHours === 'string') {
      const parts = workingHours.split('-');
      if (parts.length === 2) {
        whStart = `${parts[0].padStart(2, '0')}:00`;
        whEnd = `${parts[1].padStart(2, '0')}:00`;
      }
    } else if (workingHours && typeof workingHours === 'object') {
      whStart = workingHours.start;
      whEnd = workingHours.end;
    }

    const statusStr = (raw.Status || raw.status || '').toLowerCase();
    const isTerminated = statusStr.includes('terminated') || !!raw.terminated_on;

    const emp: Employee = {
      employeeId: id,
      name: raw.Name || raw.name || 'Unknown',
      department: raw.Dept || raw.department || 'Unknown',
      role: raw.Role || raw.role || raw.meta?.role || 'Unknown',
      monthlySalaryINR,
      tenureMonths: raw.tenureMonths || raw.tenure || 0,
      workingHoursStart: whStart,
      workingHoursEnd: whEnd,
      status: isTerminated ? 'terminated' : 'active'
    };

    // Conflict resolution: If duplicate exists, take the one with higher salary/active status as canonical (just a heuristic) or the latest.
    // For simplicity, we just overwrite, but if we wanted to be smart we could merge.
    if (employeesRecord[id]) {
        // Flag duplicate
        logs.flaggedRows++;
    }
    employeesRecord[id] = emp;
  });

  // --- Parse Activities ---
  const activityFileContent = fs.readFileSync(activityCsvPath, 'utf-8');
  const parsedCsv = Papa.parse<ActivityLogRaw>(activityFileContent, { header: true, skipEmptyLines: true });
  
  const activities: ActivityLog[] = [];
  const activityEmpIds = new Set<string>();

  parsedCsv.data.forEach(row => {
    let isValid = true;
    const duration = parseFloat(row.duration_minutes);
    
    // Outlier handling
    if (isNaN(duration) || duration <= 0) {
      logs.droppedRows++;
      return; // Skip negative, zero, or blank durations
    }
    if (duration > 480) { // More than 8 hours on a single task is flagged as outlier, maybe cap it or drop
      isValid = false;
      logs.flaggedRows++;
    }

    const ts = parseTimestampToIST(row.timestamp);
    if (!ts) {
        logs.droppedRows++;
        return;
    }

    const empId = row.employee_id?.trim();
    if (!empId) {
        logs.droppedRows++;
        return;
    }
    activityEmpIds.add(empId);

    activities.push({
      employeeId: empId,
      department: row.department?.trim() || employeesRecord[empId]?.department || 'Unknown', // fallback to HRMS
      timestamp: ts,
      appUsed: normalizeApp(row.app_used),
      taskCategory: normalizeCategory(row.task_category),
      durationMinutes: duration,
      isRepetitive: normalizeBoolean(row.is_repetitive),
      isValid
    });
  });

  // Identify Missing/Extra Employees
  Object.keys(employeesRecord).forEach(id => {
    if (!activityEmpIds.has(id)) {
      logs.extraEmployees.add(id); // In HRMS, but no activity
    }
  });

  activityEmpIds.forEach(id => {
    if (!employeesRecord[id]) {
      logs.missingEmployees.add(id); // In activity, but no HRMS
    }
  });

  cachedData = {
    activities,
    employees: employeesRecord,
    logs
  };

  return cachedData;
}
