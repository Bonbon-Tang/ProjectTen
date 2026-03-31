#!/usr/bin/env python3
"""Setup tenants and users for ProjectTen."""
import sqlite3
import bcrypt

def setup():
    conn = sqlite3.connect('data/app.db')
    c = conn.cursor()
    
    # 1. Create usr1 user (if not exists)
    c.execute('SELECT id FROM users WHERE username="usr1"')
    if c.fetchone():
        print("usr1 exists")
        c.execute('SELECT id FROM users WHERE username="usr1"')
        usr1_id = c.fetchone()[0]
    else:
        password_hash = bcrypt.hashpw(b"123", bcrypt.gensalt()).decode('utf-8')
        c.execute('''
            INSERT INTO users (username, email, phone, password_hash, user_type, status, is_verified, is_2fa_enabled, tenant_id)
            VALUES ("usr1", "usr1@example.com", "13800138001", ?, "individual", "active", 1, 0, NULL)
        ''', (password_hash,))
        usr1_id = c.lastrowid
        print(f"Created user usr1 ID={usr1_id}")
    
    # 2. Create enterprise tenant (if not exists)
    c.execute('SELECT id FROM tenants WHERE name="企业租户"')
    if c.fetchone():
        c.execute('SELECT id FROM tenants WHERE name="企业租户"')
        enterprise_id = c.fetchone()[0]
        print(f"Enterprise tenant exists ID={enterprise_id}")
    else:
        c.execute('''
            INSERT INTO tenants (name, type, description, owner_id, status, compute_quota, storage_quota, max_concurrent_tasks)
            VALUES ("企业租户", "enterprise", "企业管理员租户，拥有 23 台华为 910C", 1, "active", 10000.0, 1000.0, 10)
        ''')
        enterprise_id = c.lastrowid
        print(f"Created enterprise tenant ID={enterprise_id}")
    
    # 3. Create individual tenant (if not exists)
    c.execute('SELECT id FROM tenants WHERE name="个人租户-usr1"')
    if c.fetchone():
        c.execute('SELECT id FROM tenants WHERE name="个人租户-usr1"')
        individual_id = c.fetchone()[0]
        print(f"Individual tenant exists ID={individual_id}")
    else:
        c.execute(f'''
            INSERT INTO tenants (name, type, description, owner_id, status, compute_quota, storage_quota, max_concurrent_tasks)
            VALUES ("个人租户-usr1", "individual", "个人用户租户，拥有 1 台华为 910C", {usr1_id}, "active", 1000.0, 100.0, 2)
        ''')
        individual_id = c.lastrowid
        print(f"Created individual tenant ID={individual_id}")
        # Update usr1 tenant_id
        c.execute(f'UPDATE users SET tenant_id = {individual_id} WHERE id = {usr1_id}')
    
    # 4. Add tenant_id to compute_devices
    c.execute('PRAGMA table_info(compute_devices)')
    cols = [col[1] for col in c.fetchall()]
    if 'tenant_id' not in cols:
        c.execute('ALTER TABLE compute_devices ADD COLUMN tenant_id INTEGER')
        print("Added tenant_id column")
    else:
        print("tenant_id column exists")
    
    # 5. Update device allocations
    # Check if already done
    c.execute(f'SELECT COUNT(*) FROM compute_devices WHERE device_type="huawei_910c" AND tenant_id={enterprise_id}')
    if c.fetchone()[0] == 0:
        # Enterprise gets 23x 910C
        c.execute(f'UPDATE compute_devices SET tenant_id = {enterprise_id}, total_count = 23, available_count = 23 WHERE device_type = "huawei_910c" AND id = 1')
        
        # Individual gets 1x 910C
        c.execute(f'INSERT INTO compute_devices (name, device_type, manufacturer, total_count, available_count, specs, status, tenant_id) VALUES ("华为昇腾 910C-个人", "huawei_910c", "华为", 1, 1, \'{{"cores": 128}}\', "active", {individual_id})')
        
        # Other devices to enterprise
        c.execute(f'UPDATE compute_devices SET tenant_id = {enterprise_id} WHERE tenant_id IS NULL AND device_type != "huawei_910c"')
        print("Updated device allocations")
    else:
        print("Device allocations already done")
    
    conn.commit()
    
    # Verify
    print("\n=== Verification ===")
    print("Users:")
    for r in c.execute('SELECT id, username, user_type, tenant_id FROM users'):
        print(f"  {r}")
    
    print("Tenants:")
    for r in c.execute('SELECT id, name, type, owner_id FROM tenants'):
        print(f"  {r}")
    
    print("910C Devices:")
    for r in c.execute('SELECT id, name, total_count, tenant_id FROM compute_devices WHERE device_type="huawei_910c"'):
        print(f"  {r}")
    
    conn.close()
    print("\n✅ Setup complete!")

if __name__ == '__main__':
    setup()
