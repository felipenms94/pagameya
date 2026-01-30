import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/requireUser";
import { requireWorkspaceMember } from "@/lib/auth/requireWorkspaceMember";
import PDFDocument from "pdfkit";


export const runtime = "nodejs"; // ✅ IMPORTANTE

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) {
      return new Response("workspaceId requerido", { status: 400 });
    }

    const user = await requireUser(req);
    const userId = user.id;
    await requireWorkspaceMember(prisma, userId, workspaceId);

    const { id: personId } = await ctx.params;

    const person = await prisma.person.findFirst({
      where: { id: personId, workspaceId, deletedAt: null },
    });

    if (!person) {
      return new Response("Persona no encontrada", { status: 404 });
    }

    // Traer deudas + pagos
    const debts = await prisma.debt.findMany({
      where: { workspaceId, personId, deletedAt: null },
      include: { payments: true },
      orderBy: { createdAt: "desc" },
    });

    // Helper sums
    const openDebts = debts
      .map((d) => {
        const paymentsSum = (d.payments ?? []).reduce(
          (acc, p) => acc + Number(p.amount),
          0
        );
        const balance = Number(d.amountOriginal) - paymentsSum;
        return { ...d, paymentsSum, balance };
      })
      .filter((d) => d.balance > 0);

    const totalOriginal = openDebts.reduce(
      (a, d) => a + Number(d.amountOriginal),
      0
    );
    const totalPaid = openDebts.reduce((a, d) => a + Number(d.paymentsSum), 0);
    const totalPending = openDebts.reduce((a, d) => a + Number(d.balance), 0);

    // ✅ Generar PDF como buffer
    const doc = new PDFDocument({ size: "A4", margin: 50 });


    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    // Contenido PDF
    doc.fontSize(18).text("Estado de cuenta", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Cliente: ${person.name}`);
    doc.text(`Teléfono: ${person.phone ?? "-"}`);
    doc.text(`Fecha: ${new Date().toISOString().slice(0, 10)}`);
    doc.moveDown();
    doc.fontSize(13).text("Deudas abiertas", { underline: true });
    doc.moveDown(0.5);

    const startX = 50;
    const columns: Array<{ header: string; width: number; align: "left" | "right" | "center" }> = [
      { header: "Titulo", width: 190, align: "left" },
      { header: "Vence", width: 70, align: "left" },
      { header: "Original", width: 75, align: "right" },
      { header: "Pagado", width: 75, align: "right" },
      { header: "Pendiente", width: 85, align: "right" },
    ];
    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
    const rowHeight = 18;

    const headerY = doc.y;
    doc.save();
    doc.rect(startX, headerY - 2, tableWidth, rowHeight).fill("#F2F2F2");
    doc.restore();

    doc.font("Helvetica-Bold").fontSize(10);
    let x = startX;
    columns.forEach((col) => {
      doc.text(col.header, x, headerY, { width: col.width, align: col.align });
      x += col.width;
    });
    doc.y = headerY + rowHeight;

    doc
      .moveTo(startX, doc.y)
      .lineTo(startX + tableWidth, doc.y)
      .stroke();

    doc.font("Helvetica").fontSize(10);

    let rowIndex = 0;
    for (const d of openDebts) {
      const rowY = doc.y;
      if (rowIndex % 2 === 0) {
        doc.save();
        doc.rect(startX, rowY - 2, tableWidth, rowHeight).fill("#FAFAFA");
        doc.restore();
      }

      const values = [
        String(d.title ?? "-"),
        d.dueDate ? String(d.dueDate).slice(0, 10) : "-",
        Number(d.amountOriginal).toFixed(2),
        Number(d.paymentsSum).toFixed(2),
        Number(d.balance).toFixed(2),
      ];

      x = startX;
      values.forEach((value, index) => {
        doc.text(value, x, rowY, {
          width: columns[index].width,
          align: columns[index].align,
        });
        x += columns[index].width;
      });

      doc.y = rowY + rowHeight;
      rowIndex += 1;

      if (doc.y > doc.page.height - 80) {
        doc.addPage();
        doc.fontSize(12).text("Deudas abiertas", { underline: true });
        doc.moveDown(0.3);
        const newHeaderY = doc.y;
        doc.save();
        doc.rect(startX, newHeaderY - 2, tableWidth, rowHeight).fill("#F2F2F2");
        doc.restore();
        doc.font("Helvetica-Bold").fontSize(10);
        x = startX;
        columns.forEach((col) => {
          doc.text(col.header, x, newHeaderY, {
            width: col.width,
            align: col.align,
          });
          x += col.width;
        });
        doc.y = newHeaderY + rowHeight;
        doc
          .moveTo(startX, doc.y)
          .lineTo(startX + tableWidth, doc.y)
          .stroke();
        doc.font("Helvetica").fontSize(10);
      }
    }

    doc.moveDown(0.5);

    doc.fontSize(12).text(`Total original: $${totalOriginal.toFixed(2)}`);

    doc.text(`Total pagado: $${totalPaid.toFixed(2)}`);
    doc.text(`Total pendiente: $${totalPending.toFixed(2)}`);

    doc.end();

    const pdfBuffer = await pdfBufferPromise;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="statement-${person.name}.pdf"`,
      },
    });
  } catch (e) {
    console.error("PDF statement error:", e);
    return new Response("Error generando PDF", { status: 500 });
  }
}

