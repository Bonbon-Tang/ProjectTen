import React from 'react';
import { Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  title: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  extra?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, breadcrumbs = [], extra }: PageHeaderProps) {
  const hasDashboard = title !== 'Benchmark';
  const items = [
    { title: <Link to={hasDashboard ? '/dashboard' : '/benchmark/models'}>首页</Link> },
    ...breadcrumbs.map((item) =>
      item.path
        ? { title: <Link to={item.path}>{item.title}</Link> }
        : { title: item.title },
    ),
  ];

  return (
    <div className="tech-hero" style={{ marginBottom: 20, padding: '16px 20px' }}>
      <Breadcrumb items={items} style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#061322' }}>{title}</h2>
          {subtitle ? <div style={{ marginTop: 6, color: '#4d6480', fontSize: 14 }}>{subtitle}</div> : null}
        </div>
        {extra && <div>{extra}</div>}
      </div>
    </div>
  );
}
