import { FC } from 'react';

interface StatItem {
  name: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

interface DashboardStatsProps {
  stats: StatItem[];
}

const DashboardStats: FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="card overflow-hidden"
        >
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                <stat.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {stat.name}
                </dt>
                <dd className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </p>
                </dd>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;