import { useState, type DragEvent } from 'react';

/** Takes an image file, dropped or chosen; other files are refused. */
export function ImageDropZone({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const [notAnImage, setNotAnImage] = useState(false);

  const take = (file: File | undefined) => {
    if (file === undefined) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      setNotAnImage(true);
      return;
    }
    setNotAnImage(false);
    onFile(file);
  };

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    take(event.dataTransfer.files[0]);
  };

  return (
    <section
      aria-label="Image du QR code"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      className={`space-y-3 rounded-md border-2 border-dashed p-4 ${
        dragging ? 'border-indigo-700 bg-indigo-50' : 'border-slate-300 bg-white'
      }`}
    >
      <h2 className="font-semibold">Image du QR code</h2>
      <p className="text-sm text-slate-600">
        Glissez ici l'image du QR code reçue par email (Mailpit), ou choisissez-la.
      </p>
      <label className="inline-block cursor-pointer rounded border border-indigo-700 px-4 py-2 font-semibold text-indigo-700">
        Choisir une image
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            take(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </label>
      {notAnImage && (
        <p role="alert" className="text-sm text-red-800">
          Ce fichier n'est pas une image.
        </p>
      )}
    </section>
  );
}
