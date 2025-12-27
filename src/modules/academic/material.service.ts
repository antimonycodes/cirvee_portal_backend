import prisma from "@config/database";
import { uploadToCloudinary, removeFromCloudinary } from "../../utils/cloudinary";
import { Material } from "@prisma/client";

export class MaterialService {
  // Add a new material to a cohort
  static async addMaterial(data: {
    cohortId: string;
    title: string;
    description?: string;
    type: string;
    file?: Express.Multer.File;
    url?: string;
  }): Promise<Material> {
    let finalUrl = data.url;
    let publicId: string | undefined;

    if (data.file) {
      const result = await uploadToCloudinary(data.file, `cohorts/${data.cohortId}/materials`);
      finalUrl = result.secure_url;
      publicId = result.public_id;
    }

    if (!finalUrl) {
      throw new Error("Either a file or a URL must be provided for materials.");
    }

    // Get the current max order to place this at the end
    const lastMaterial = await prisma.material.findFirst({
      where: { cohortId: data.cohortId },
      orderBy: { order: "desc" },
    });

    const order = (lastMaterial?.order ?? -1) + 1;

    return prisma.material.create({
      data: {
        cohortId: data.cohortId,
        title: data.title,
        description: data.description,
        type: data.type,
        url: finalUrl,
        publicId,
        order,
      },
    });
  }

  // Get all materials for a cohort
  static async getCohortMaterials(cohortId: string): Promise<Material[]> {
    return prisma.material.findMany({
      where: { cohortId },
      orderBy: { order: "asc" },
    });
  }

  // Delete a material
  static async deleteMaterial(id: string): Promise<void> {
    const material = await prisma.material.findUnique({
      where: { id },
    });

    if (!material) {
      throw new Error("Material not found");
    }

    if (material.publicId) {
      await removeFromCloudinary(material.publicId);
    }

    await prisma.material.delete({
      where: { id },
    });
  }

  // Reorder materials
  static async reorderMaterials(cohortId: string, materialIds: string[]): Promise<void> {
    await prisma.$transaction(
      materialIds.map((id, index) =>
        prisma.material.update({
          where: { id },
          data: { order: index },
        })
      )
    );
  }
}
