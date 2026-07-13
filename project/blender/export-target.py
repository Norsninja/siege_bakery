# THE PRACTICE TARGET EXPORT (plans/15 item 25 — the visionary's own
# model, wood_target_lg.blend, replaces the greybox plank stand). The
# script is the recipe (region-scripts / make-sfx culture): re-run after
# any edit to the blend, then `npm run diet -- target`.
#
# The model ships at BLEND SCALE (~1.9 x 1.8 units, origin mid-body,
# feet at z -0.903); the client scales and lifts it to the ruled size
# (core/dessert.ts PRACTICE_STAND — scale 3, lift 2.71). The painted
# face looks down -Y in Blender, which the exporter's Y-up conversion
# turns into game +z: the face greets town 0 with no rotation.
#
# Run:
#   blender --background wood_target_lg.blend --python export-target.py
import bpy
import os

# THE EMISSIVE STRIP: meshy baked ~5% of the emissive map bright (the
# pale cupcake paint leaked into the bake — max 218, mean 8) and the
# diet's blackness check rightly keeps real glow, so the junk must die
# HERE, in the recipe. A wooden target does not glow. THE EMISSIVE
# TRAP (wall precedent): zero the COLOR and the STRENGTH — dropping
# only the texture leaves Emission Color white and the model GLOWS.
for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    for node in mat.node_tree.nodes:
        if node.type != "BSDF_PRINCIPLED":
            continue
        for name in ("Emission Color", "Emission"):
            sock = node.inputs.get(name)
            if sock is None:
                continue
            for link in list(sock.links):
                mat.node_tree.links.remove(link)
            sock.default_value = (0.0, 0.0, 0.0, 1.0)
        strength = node.inputs.get("Emission Strength")
        if strength is not None:
            strength.default_value = 0.0

out = os.path.normpath(
    os.path.join(os.path.dirname(bpy.data.filepath), "..", "..", "public", "models", "target.glb")
)
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=True)
print("EXPORTED %s" % out)
