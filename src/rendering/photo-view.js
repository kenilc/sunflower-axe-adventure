// The canvas and optical frame share exactly the same rectangle. Photos use
// the same projection, so everything inside the viewfinder is saved.
export function createPhotoView({ renderer, camera, frame, format }) {
  function resize(active) {
    if (active) {
      const top = innerHeight < 500 ? 52 : 76;
      const bottom = innerHeight < 500 ? 88 : 204;
      const aspect = innerWidth < innerHeight ? 3 / 4 : 4 / 3;
      const width = Math.max(
        1,
        Math.min(innerWidth - 32, (innerHeight - top - bottom) * aspect),
      );
      const height = width / aspect;
      const left = (innerWidth - width) / 2;
      const y = top + Math.max(0, (innerHeight - top - bottom - height) / 2);
      const style = {
        position: "fixed",
        left: `${left}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      };
      renderer.setSize(width, height);
      Object.assign(renderer.domElement.style, style);
      Object.assign(frame.style, style);
      camera.aspect = aspect;
      if (format) format.textContent = aspect < 1 ? "3:4" : "4:3";
    } else {
      Object.assign(renderer.domElement.style, {
        position: "",
        left: "",
        top: "",
      });
      renderer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
    }
    camera.updateProjectionMatrix();
  }
  return { resize };
}
