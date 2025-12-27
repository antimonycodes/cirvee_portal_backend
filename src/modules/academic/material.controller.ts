import { Request, Response } from "express";
import { MaterialService } from "./material.service";
import { ResponseUtil } from "../../utils/response";
import { AuthRequest } from "../../types";

export class MaterialController {
  static async addMaterial(req: Request, res: Response) {
    const { cohortId } = req.params;
    const { title, description, type, url } = req.body;
    const file = req.file;

    const material = await MaterialService.addMaterial({
      cohortId,
      title,
      description,
      type,
      file,
      url,
    });

    return ResponseUtil.created(res, "Material added successfully", material);
  }

  static async getCohortMaterials(req: Request, res: Response) {
    const { cohortId } = req.params;
    const materials = await MaterialService.getCohortMaterials(cohortId);
    return ResponseUtil.success(res, "Materials retrieved successfully", materials);
  }

  static async deleteMaterial(req: Request, res: Response) {
    const { id } = req.params;
    await MaterialService.deleteMaterial(id);
    return ResponseUtil.success(res, "Material deleted successfully");
  }

  static async reorderMaterials(req: Request, res: Response) {
    const { cohortId } = req.params;
    const { materialIds } = req.body;

    if (!Array.isArray(materialIds)) {
      throw new Error("materialIds must be an array of strings");
    }

    await MaterialService.reorderMaterials(cohortId, materialIds);
    return ResponseUtil.success(res, "Materials reordered successfully");
  }
}
