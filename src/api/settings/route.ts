import { errorResponse, json } from "@/lib/api";
import { getActor } from "@/lib/actor";
import { parseAmount } from "@/lib/money";
import { getSettings, updateSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getActor();
    const settings = await getSettings();
    return json({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    await getActor();

    const body = (await request.json()) as {
      companyName?: string;
      weeklyCap?: string | number;
      checksWeeklyCap?: string | number;
      greenMax?: string | number;
      yellowMax?: string | number;
    };

    const weeklyCap = parseAmount(String(body.weeklyCap ?? ""));
    const checksWeeklyCap = parseAmount(String(body.checksWeeklyCap ?? ""));
    const greenMax = parseAmount(String(body.greenMax ?? ""));
    const yellowMax = parseAmount(String(body.yellowMax ?? ""));

    if (weeklyCap == null || weeklyCap < 0 || checksWeeklyCap == null || checksWeeklyCap < 0 || greenMax == null || yellowMax == null) {
      return json({ error: "Los importes de tope y semáforo no son válidos." }, 400);
    }
    if (greenMax > yellowMax) {
      return json({ error: "El umbral verde no puede ser mayor que el amarillo." }, 400);
    }

    const settings = await updateSettings({
      companyName: body.companyName?.trim() || "Tesorería",
      weeklyCap: weeklyCap.toFixed(2),
      checksWeeklyCap: checksWeeklyCap.toFixed(2),
      greenMax: greenMax.toFixed(2),
      yellowMax: yellowMax.toFixed(2),
    });

    return json({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}
