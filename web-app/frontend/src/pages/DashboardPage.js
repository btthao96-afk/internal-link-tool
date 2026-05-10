import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  BarChart3,
  FolderOpen,
  Plus,
  TrendingUp,
  Link as LinkIcon,
  Users,
  Activity
} from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalPages: 0,
    totalLinks: 0,
    activeProjects: 0
  });
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsResponse, projectsResponse] = await Promise.all([
        axios.get('/api/projects/stats'),
        axios.get('/api/projects?limit=5')
      ]);

      setStats(statsResponse.data);
      setRecentProjects(projectsResponse.data.projects || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-sm text-green-600 flex items-center mt-1">
              <TrendingUp size={14} className="mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your internal linking projects.
            </p>
          </div>
          <Link
            to="/projects"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>New Project</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Projects"
          value={stats.totalProjects}
          icon={FolderOpen}
          color="bg-blue-500"
          trend="+12% from last month"
        />
        <StatCard
          title="Total Pages"
          value={stats.totalPages}
          icon={BarChart3}
          color="bg-green-500"
          trend="+8% from last month"
        />
        <StatCard
          title="Internal Links"
          value={stats.totalLinks}
          icon={LinkIcon}
          color="bg-purple-500"
          trend="+15% from last month"
        />
        <StatCard
          title="Active Projects"
          value={stats.activeProjects}
          icon={Activity}
          color="bg-orange-500"
        />
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <Link
              to="/projects"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View all projects →
            </Link>
          </div>
        </div>

        <div className="p-6">
          {recentProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-4">
                Get started by creating your first internal linking project.
              </p>
              <Link
                to="/projects"
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors inline-flex items-center space-x-2"
              >
                <Plus size={18} />
                <span>Create Project</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <FolderOpen size={20} className="text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-600">
                        {project.pages_count || 0} pages • {project.links_count || 0} links
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      project.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status}
                    </span>
                    <Link
                      to={`/projects/${project.id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/projects"
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Plus size={20} className="text-primary-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Create Project</h3>
              <p className="text-sm text-gray-600">Start a new internal linking project</p>
            </div>
          </Link>

          <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg opacity-50 cursor-not-allowed">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-gray-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Invite Team</h3>
              <p className="text-sm text-gray-600">Coming soon</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg opacity-50 cursor-not-allowed">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <BarChart3 size={20} className="text-gray-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Analytics</h3>
              <p className="text-sm text-gray-600">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
