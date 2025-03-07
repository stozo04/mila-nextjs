import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { supabase } from '@/lib/supabase';
import { JourneyCard } from '@/types/blog';
import { JourneyType } from '@/lib/supabase/journey';

interface CreateJourneyCardModalProps {
  show: boolean;
  onHide: () => void;
  onCardCreated: (card: JourneyCard) => void;
  journeyType: JourneyType;
}

const CreateJourneyCardModal = ({ show, onHide, onCardCreated, journeyType }: CreateJourneyCardModalProps) => {
  const [newCard, setNewCard] = useState<JourneyCard & { journey_type: JourneyType }>({
    title: "",
    message: "",
    slug: "",
    date: "",
    journey_type: journeyType
  });

  const handleCreateCard = async () => {
    try {
      const { data, error } = await supabase
        .from("journey_cards")
        .insert([newCard])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        onCardCreated(data[0]);
        onHide();
        setNewCard({
          title: "",
          message: "",
          slug: "",
          date: "",
          journey_type: journeyType
        });
      }
    } catch (error) {
      console.error("Error creating journey card:", error);
      alert("Error creating journey card. Please try again.");
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Create New Journey Card</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              value={newCard.title}
              placeholder="e.g., 1 Year 9 Months (21 Months)"
              onChange={(e) => setNewCard({ ...newCard, title: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Message</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={newCard.message}
              placeholder="e.g., Learning and Growing!"
              onChange={(e) => setNewCard({ ...newCard, message: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Slug</Form.Label>
            <Form.Control
              type="text"
              value={newCard.slug}
              placeholder="e.g., one-year-nine-months"
              onChange={(e) => setNewCard({ ...newCard, slug: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Date</Form.Label>
            <Form.Control
              type="text"
              value={newCard.date}
              placeholder="e.g., September 30 - October 30, 2024"
              onChange={(e) => setNewCard({ ...newCard, date: e.target.value })}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleCreateCard}>
          Create
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateJourneyCardModal; 