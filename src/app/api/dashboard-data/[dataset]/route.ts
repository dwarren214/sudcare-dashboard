import { NextResponse } from "next/server";
import { loadDataset, DatasetLoadError } from "@/lib/data-repository";
import type { DatasetKey } from "../../../../../types/dashboard";

interface RouteParams {
  params: {
    dataset: string;
  };
}

export async function GET(_: Request, context: RouteParams) {
  const datasetParam = context.params.dataset;

  if (!isDatasetKey(datasetParam)) {
    return NextResponse.json(
      { error: `Unknown dataset "${datasetParam}"` },
      { status: 400 },
    );
  }

  try {
    const result = await loadDataset(datasetParam);
    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof DatasetLoadError) {
      const status = error.source === "api" ? 502 : 500;
      return NextResponse.json(
        { error: error.userMessage },
        { status },
      );
    }

    return NextResponse.json(
      { error: "Unexpected error while loading dataset" },
      { status: 500 },
    );
  }
}

function isDatasetKey(value: string): value is DatasetKey {
  return value === "all" || value === "exclude_p266";
}
