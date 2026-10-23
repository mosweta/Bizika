// src/features/lessons/renderer/sampleLesson.js

export const SAMPLE_LESSON = {
  format: "bizika/blocks/v1",
  objectives: [
    "Explain what database normalization is",
    "Identify data redundancy in a schema",
    "Describe 1NF, 2NF, and 3NF",
    "Apply normalization to a small table",
  ],
  sections: [
    {
      id: "sec_intro",
      title: "What is Normalization?",
      blocks: [
        {
          id: "blk_intro_p1",
          type: "paragraph",
          content: [
            { text: "Database normalization is the process of organizing " },
            { text: "columns and tables", marks: [{ type: "bold" }] },
            { text: " of a relational database to minimize " },
            { text: "redundancy", marks: [{ type: "italic" }] },
            { text: " and dependency. It was first introduced by " },
            {
              text: "Edgar F. Codd",
              marks: [
                {
                  type: "link",
                  attrs: { href: "https://en.wikipedia.org/wiki/Edgar_F._Codd" },
                },
              ],
            },
            { text: " in 1970." },
          ],
        },
        {
          id: "blk_intro_callout",
          type: "callout",
          variant: "key_concept",
          title: "Key concept",
          content: [
            {
              text: "Normalization reduces redundancy by ensuring each piece of data is stored in exactly one place.",
            },
          ],
        },
        {
          id: "blk_intro_h2",
          type: "heading",
          level: 2,
          content: [{ text: "Why it matters" }],
        },
        {
          id: "blk_intro_p2",
          type: "paragraph",
          content: [
            { text: "Without normalization, an update to a single value can require changes in many places. This leads to " },
            { text: "update anomalies", marks: [{ type: "bold" }] },
            { text: ", " },
            { text: "insert anomalies", marks: [{ type: "bold" }] },
            { text: ", and " },
            { text: "delete anomalies", marks: [{ type: "bold" }] },
            { text: "." },
          ],
        },
        {
          id: "blk_intro_list",
          type: "list",
          ordered: false,
          items: [
            [{ text: "Update anomaly: a change must be made in multiple rows" }],
            [{ text: "Insert anomaly: you cannot store one fact without another" }],
            [{ text: "Delete anomaly: deleting one fact accidentally loses another" }],
          ],
        },
        {
          id: "blk_intro_img",
          type: "image",
          url: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800",
          alt: "Diagram showing normalized tables",
          caption: "A normalized schema splits data into related tables.",
        },
      ],
    },
    {
      id: "sec_forms",
      title: "The Three Normal Forms",
      blocks: [
        {
          id: "blk_forms_p1",
          type: "paragraph",
          content: [
            { text: "There are many normal forms, but three cover the vast majority of real-world cases: " },
            { text: "1NF", marks: [{ type: "bold" }] },
            { text: ", " },
            { text: "2NF", marks: [{ type: "bold" }] },
            { text: ", and " },
            { text: "3NF", marks: [{ type: "bold" }] },
            { text: "." },
          ],
        },
        {
          id: "blk_forms_table",
          type: "table",
          headers: [
            [{ text: "Normal form" }],
            [{ text: "Requirement" }],
          ],
          rows: [
            [
              [{ text: "1NF" }],
              [{ text: "All columns contain atomic values; no repeating groups" }],
            ],
            [
              [{ text: "2NF" }],
              [{ text: "Meets 1NF; no partial dependencies on a composite key" }],
            ],
            [
              [{ text: "3NF" }],
              [{ text: "Meets 2NF; no transitive dependencies on the primary key" }],
            ],
          ],
        },
        {
          id: "blk_forms_video",
          type: "video",
          url: "https://www.youtube.com/watch?v=UrYLYV7WSHM",
          caption: "A short walkthrough of the three forms.",
        },
        {
          id: "blk_forms_divider",
          type: "divider",
        },
        {
          id: "blk_forms_h3",
          type: "heading",
          level: 3,
          content: [{ text: "A worked example" }],
        },
        {
          id: "blk_forms_p2",
          type: "paragraph",
          content: [
            { text: "Consider a table that stores orders, customer names, and product names in one row. In 1NF we split orders from products. In 2NF we separate customer details from order details. In 3NF we remove any field that depends on a non-key column." },
          ],
        },
        {
          id: "blk_forms_file",
          type: "file",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          name: "Worked example — printable PDF",
          size: 13264,
        },
      ],
    },
    {
      id: "sec_check",
      title: "Check Your Understanding",
      blocks: [
        {
          id: "blk_check_p",
          type: "paragraph",
          content: [
            { text: "Try the question below. You'll see the explanation after you answer." },
          ],
        },
        {
          id: "blk_check_q1",
          type: "question",
          questionType: "multiple_choice",
          question: "Which normal form removes repeating groups from a table?",
          options: [
            { id: "a", text: "First Normal Form (1NF)" },
            { id: "b", text: "Second Normal Form (2NF)" },
            { id: "c", text: "Third Normal Form (3NF)" },
            { id: "d", text: "None of the above" },
          ],
          correctOption: "a",
          explanation:
            "1NF requires that all columns contain atomic values and that there are no repeating groups. 2NF and 3NF build on 1NF.",
        },
        {
          id: "blk_check_callout",
          type: "callout",
          variant: "tip",
          title: "Tip",
          content: [
            {
              text: "In practice, most schemas stop at 3NF. Higher normal forms (BCNF, 4NF, 5NF) exist but are rarely needed.",
            },
          ],
        },
        {
          id: "blk_check_q2",
          type: "question",
          questionType: "multiple_choice",
          question:
            "A table stores student names and their campus addresses in the same column. Which normal form is violated?",
          options: [
            { id: "a", text: "1NF — the column isn't atomic" },
            { id: "b", text: "2NF — partial dependency" },
            { id: "c", text: "3NF — transitive dependency" },
            { id: "d", text: "None — this is fine" },
          ],
          correctOption: "a",
          explanation:
            "If name and address are stored together in one column, the column isn't atomic. 1NF requires one value per cell.",
        },
        {
          id: "blk_check_warning",
          type: "callout",
          variant: "warning",
          title: "Careful",
          content: [
            {
              text: "Over-normalizing can make queries complex and slow. Balance is key.",
            },
          ],
        },
      ],
    },
  ],
};