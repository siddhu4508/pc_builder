import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Table,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
  Badge,
  Pagination,
  Card,
  ListGroup
} from 'react-bootstrap';
import { FaEdit, FaTrash, FaPlus, FaSearch, FaShare } from 'react-icons/fa';

interface BuildComponent {
  id: number;
  component: {
    id: number;
    name: string;
    category: string;
    price: number;
    image_url: string;
  };
  quantity: number;
}

interface PCBuild {
  id: number;
  name: string;
  description: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    username: string;
  };
  components: BuildComponent[];
  is_public: boolean;
}

const BuildManagement: React.FC = () => {
  const [builds, setBuilds] = useState<PCBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState<PCBuild | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    fetchBuilds();
  }, [currentPage]);

  const fetchBuilds = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/builds/?page=${currentPage}`);
      setBuilds(response.data.results);
      setTotalPages(Math.ceil(response.data.count / 10));
    } catch (err) {
      setError('Failed to fetch builds');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (build?: PCBuild) => {
    if (build) {
      setSelectedBuild(build);
    } else {
      setSelectedBuild(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBuild(null);
  };

  const handleDelete = async (buildId: number) => {
    if (window.confirm('Are you sure you want to delete this build?')) {
      try {
        await api.delete(`/admin/builds/${buildId}/`);
        fetchBuilds();
      } catch (err) {
        setError('Failed to delete build');
        console.error(err);
      }
    }
  };

  const handleShare = async (buildId: number) => {
    try {
      const response = await api.post(`/admin/builds/${buildId}/share/`);
      setShareUrl(response.data.share_url);
      setShowShareModal(true);
    } catch (err) {
      setError('Failed to generate share URL');
      console.error(err);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredBuilds = builds.filter(build =>
    build.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    build.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    build.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Build Management</h2>
        <Button variant="primary" onClick={() => handleShowModal()}>
          <FaPlus className="me-2" />
          Create Build
        </Button>
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      <div className="mb-3">
        <div className="input-group">
          <span className="input-group-text">
            <FaSearch />
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="Search builds..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          <div className="row">
            {filteredBuilds.map(build => (
              <div key={build.id} className="col-md-6 col-lg-4 mb-4">
                <Card>
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">{build.name}</h5>
                    <Badge bg={build.is_public ? 'success' : 'secondary'}>
                      {build.is_public ? 'Public' : 'Private'}
                    </Badge>
                  </Card.Header>
                  <Card.Body>
                    <p className="text-muted">{build.description}</p>
                    <ListGroup variant="flush">
                      <ListGroup.Item>
                        <strong>Total Price:</strong> ₹{build.total_price.toLocaleString()}
                      </ListGroup.Item>
                      <ListGroup.Item>
                        <strong>Created by:</strong> {build.user.username}
                      </ListGroup.Item>
                      <ListGroup.Item>
                        <strong>Created:</strong>{' '}
                        {new Date(build.created_at).toLocaleDateString()}
                      </ListGroup.Item>
                    </ListGroup>
                  </Card.Body>
                  <Card.Footer>
                    <div className="d-flex justify-content-between">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleShowModal(build)}
                      >
                        <FaEdit className="me-1" />
                        Edit
                      </Button>
                      <div>
                        <Button
                          variant="outline-success"
                          size="sm"
                          className="me-2"
                          onClick={() => handleShare(build.id)}
                        >
                          <FaShare className="me-1" />
                          Share
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(build.id)}
                        >
                          <FaTrash className="me-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card.Footer>
                </Card>
              </div>
            ))}
          </div>

          <Pagination className="justify-content-center">
            <Pagination.First
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            />
            <Pagination.Prev
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            />
            <Pagination.Item active>{currentPage}</Pagination.Item>
            <Pagination.Next
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            />
            <Pagination.Last
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
            />
          </Pagination>
        </>
      )}

      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedBuild ? 'Edit Build' : 'Create New Build'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Build form will go here */}
          <p>Build form implementation coming soon...</p>
        </Modal.Body>
      </Modal>

      <Modal show={showShareModal} onHide={() => setShowShareModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Share Build</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Share this URL with others to view the build:</p>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              value={shareUrl}
              readOnly
            />
            <Button
              variant="outline-primary"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                alert('URL copied to clipboard!');
              }}
            >
              Copy
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default BuildManagement; 