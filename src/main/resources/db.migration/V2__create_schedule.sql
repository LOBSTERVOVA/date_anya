CREATE TABLE schedule
(
    uuid       UUID NOT NULL,
    title      VARCHAR(255),
    start_date date,
    end_date   date,
    active     BOOLEAN,
    CONSTRAINT pk_schedule PRIMARY KEY (uuid)
);

ALTER TABLE pairs
    ADD schedule_uuid UUID;
