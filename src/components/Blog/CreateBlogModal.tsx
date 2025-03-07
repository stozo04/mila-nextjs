import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { supabase } from '@/lib/supabase';
import { Blog } from '@/types/blog';

interface CreateBlogModalProps {
  show: boolean;
  onHide: () => void;
  onBlogCreated: (blog: Blog) => void;
}

const CreateBlogModal = ({ show, onHide, onBlogCreated }: CreateBlogModalProps) => {
  const [newBlog, setNewBlog] = useState({
    title: "",
    slug: "",
    content: "",
    featured_image: "",
    detail_image: "",
    tag: "",
    date: new Date().toISOString()
  });

  const handleCreateBlog = async () => {
    try {
      const { data, error } = await supabase
        .from("blogs")
        .insert([newBlog])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        onBlogCreated(data[0]);
        onHide();
        setNewBlog({
          title: "",
          slug: "",
          content: "",
          featured_image: "",
          detail_image: "",
          tag: "",
          date: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Error creating blog:", error);
      alert("Error creating blog. Please try again.");
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Create New Blog</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              value={newBlog.title}
              onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Slug</Form.Label>
            <Form.Control
              type="text"
              value={newBlog.slug}
              onChange={(e) => setNewBlog({ ...newBlog, slug: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Content</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              value={newBlog.content}
              onChange={(e) => setNewBlog({ ...newBlog, content: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Featured Image Link</Form.Label>
            <Form.Control
              type="text"
              value={newBlog.featured_image}
              onChange={(e) => setNewBlog({ ...newBlog, featured_image: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Detail Image Link</Form.Label>
            <Form.Control
              type="text"
              value={newBlog.detail_image}
              onChange={(e) => setNewBlog({ ...newBlog, detail_image: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Tag</Form.Label>
            <Form.Control
              type="text"
              value={newBlog.tag}
              onChange={(e) => setNewBlog({ ...newBlog, tag: e.target.value })}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleCreateBlog}>
          Create
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateBlogModal; 