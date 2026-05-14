ALTER TABLE app_user ADD COLUMN IF NOT EXISTS department_uuid UUID REFERENCES departments(uuid);
