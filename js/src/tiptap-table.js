import { TableKit } from "@tiptap/extension-table";

export function createPapyroTableExtensions() {
  return [
    TableKit.configure({
      table: {
        HTMLAttributes: {
          class: "mn-tiptap-table",
        },
        resizable: true,
      },
      tableRow: {
        HTMLAttributes: {
          class: "mn-tiptap-table-row",
        },
      },
      tableHeader: {
        HTMLAttributes: {
          class: "mn-tiptap-table-header",
        },
      },
      tableCell: {
        HTMLAttributes: {
          class: "mn-tiptap-table-cell",
        },
      },
    }),
  ];
}
