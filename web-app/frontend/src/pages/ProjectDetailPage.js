import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Globe,
  BarChart3,
  Link as LinkIcon,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Edit
} from 'lucide-react';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [pages, setPages] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadProjectData();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProjectData = async () => {
    try {
      const [projectResponse, pagesResponse, linksResponse] = await Promise.all([
        axios.get(`/api/projects/${id}`),
        axios.get(`/api/projects/${id}/pages`),
        axios.get(`/api/projects/${id}/links`)
      ]);

      setProject(projectResponse.data);
      setPages(pagesResponse.data.pages || []);
      setLinks(linksResponse.data.links || []);
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProjectStatus = async () => {
    try {
      const newStatus = project.status === 'active' ? 'paused' : 'active';
      await axios.patch(`/api/projects/${id}`, { status: newStatus });
      setProject({ ...project, status: newStatus });
    } catch (error) {
      console.error('Failed to update project status:', error);
    }
  };

  const runCrawler = async () => {
    try {
      await axios.post(`/api/projects/${id}/crawl`);
      // Refresh data after crawling
      loadProjectData();
    } catch (error) {
      console.error('Failed to run crawler:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Project not found</h2>
        <Link to="/projects" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          ← Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/projects"
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600">{project.description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 text-sm rounded-full ${
            project.status === 'active'
              ? 'bg-green-100 text-green-800'
              : project.status === 'paused'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {project.status}
          </span>

          <button
            onClick={toggleProjectStatus}
            className={`p-2 rounded-lg transition-colors ${
              project.status === 'active'
                ? 'text-yellow-600 hover:bg-yellow-50'
                : 'text-green-600 hover:bg-green-50'
            }`}
            title={project.status === 'active' ? 'Pause project' : 'Activate project'}
          >
            {project.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            onClick={runCrawler}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="Run crawler"
          >
            <RefreshCw size={18} />
          </button>

          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Project Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <Globe className="text-blue-500" size={24} />
            <div>
              <p className="text-sm text-gray-600">Website</p>
              <p className="font-medium text-gray-900 truncate">{project.website_url}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <BarChart3 className="text-green-500" size={24} />
            <div>
              <p className="text-sm text-gray-600">Pages</p>
              <p className="text-2xl font-bold text-gray-900">{pages.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <LinkIcon className="text-purple-500" size={24} />
            <div>
              <p className="text-sm text-gray-600">Internal Links</p>
              <p className="text-2xl font-bold text-gray-900">{links.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3">
            <RefreshCw className="text-orange-500" size={24} />
            <div>
              <p className="text-sm text-gray-600">Last Crawled</p>
              <p className="font-medium text-gray-900">
                {project.last_crawled_at
                  ? new Date(project.last_crawled_at).toLocaleDateString()
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'pages', label: 'Pages', icon: Globe },
              { id: 'links', label: 'Links', icon: LinkIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Statistics */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Pages Crawled</span>
                      <span className="font-medium">{pages.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Internal Links Found</span>
                      <span className="font-medium">{links.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Links per Page</span>
                      <span className="font-medium">
                        {pages.length > 0 ? (links.length / pages.length).toFixed(1) : 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Project Status</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        project.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Project created</span>
                      <span className="text-sm text-gray-400">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {project.last_crawled_at && (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Last crawled</span>
                        <span className="text-sm text-gray-400">
                          {new Date(project.last_crawled_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Pages ({pages.length})</h3>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Export CSV
                </button>
              </div>

              {pages.length === 0 ? (
                <div className="text-center py-12">
                  <Globe size={48} className="mx-auto text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No pages found</h4>
                  <p className="text-gray-600 mb-4">
                    Run the crawler to discover pages on your website.
                  </p>
                  <button
                    onClick={runCrawler}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Run Crawler
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          URL
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Links
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Modified
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pages.map((page) => (
                        <tr key={page.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 truncate max-w-xs">
                              {page.url}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 truncate max-w-xs">
                              {page.title || 'No title'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {page.links_count || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(page.updated_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-primary-600 hover:text-primary-900">
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'links' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Internal Links ({links.length})</h3>
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  Export CSV
                </button>
              </div>

              {links.length === 0 ? (
                <div className="text-center py-12">
                  <LinkIcon size={48} className="mx-auto text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No links found</h4>
                  <p className="text-gray-600 mb-4">
                    Run the crawler to discover internal links on your website.
                  </p>
                  <button
                    onClick={runCrawler}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Run Crawler
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source Page
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Target Page
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Anchor Text
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Relevance Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {links.map((link) => (
                        <tr key={link.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 truncate max-w-xs">
                              {link.source_url}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 truncate max-w-xs">
                              {link.target_url}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 truncate max-w-xs">
                              {link.anchor_text || 'No anchor text'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              link.relevance_score > 0.8
                                ? 'bg-green-100 text-green-800'
                                : link.relevance_score > 0.5
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {(link.relevance_score * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-primary-600 hover:text-primary-900">
                              <Edit size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailPage;
