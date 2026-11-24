import { adminUser } from "../../../../../../admin/auth";
import { canPreview, referencePattern, uuidPattern } from "../../../../../../admin/model";
import { adminDocument } from "../../../../../../admin/store";
import { privateStorage } from "../../../../../../intake/supabase";

export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export async function GET(request: Request, context: { params: Promise<{ reference: string; documentId: string }> }) {
  const { reference, documentId } = await context.params;
  if (!referencePattern.test(reference) || !uuidPattern.test(documentId) || !(await adminUser())) {
    return new Response(null, { status: 404, headers: privateHeaders });
  }
  const document = await adminDocument(reference, documentId);
  if (!document) return new Response(null, { status: 404, headers: privateHeaders });

  try {
    const { data, error } = await privateStorage().download(document.storage_path, {}, { signal: AbortSignal.timeout(12000) });
    if (error || !data) return new Response(null, { status: 404, headers: privateHeaders });
    const mediaType = canPreview(document.content_type) ? document.content_type : "application/octet-stream";
    const download = mediaType === "application/octet-stream" || new URL(request.url).searchParams.get("download") === "1";
    const filename = encodeURIComponent(document.original_filename.toWellFormed()).replace(
      /['()*]/g, (character) => "%" + character.charCodeAt(0).toString(16),
    );
    return new Response(data, {
      headers: {
        ...privateHeaders,
        "Content-Type": mediaType,
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${filename}`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": mediaType === "application/pdf"
          ? "frame-ancestors 'none'"
          : "default-src 'none'; img-src 'self'; frame-ancestors 'none'",
      },
    });
  } catch {
    return new Response(null, { status: 503, headers: privateHeaders });
  }
}
