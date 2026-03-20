import React from 'react';
import { Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  title: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  extra?: React.ReactNode;
}

export default function PageHeader({ title, breadcrumbs = [], extra }: PageHeaderProps) {
  const items = [
    { title: <Link to="/dashboard">首页</Link> },
    ...breadcrumbs.map((item) =>
      item.path
        ? { title: <Link to={item.path}>{item.title}</Link> }
        : { title: item.title },
    ),
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <Breadcrumb items={items} style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#1B3A6B' }}>{title}</h2>
        {extra && <div>{extra}</div>}
      </div>
    </div>
  );
}
