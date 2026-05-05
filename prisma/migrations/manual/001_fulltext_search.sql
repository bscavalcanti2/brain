-- Add tsvector column
ALTER TABLE notes ADD COLUMN search_vec tsvector;

-- Create GIN index
CREATE INDEX idx_notes_search ON notes USING GIN (search_vec);

-- Create trigger function
CREATE OR REPLACE FUNCTION notes_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vec :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER notes_search_trigger
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION notes_search_update();
