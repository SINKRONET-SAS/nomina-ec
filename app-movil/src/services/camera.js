// ============================================================
// PLAN HAIKY - Servicio de CÃ¡mara (App MÃ³vil)
// ============================================================
import { Camera } from 'expo-camera';

export async function solicitarPermisoCamara() {
  const { status } = await Camera.requestCameraPermissionsAsync();
  return status === 'granted';
}

export async function tomarFoto(cameraRef) {
  if (!cameraRef) throw new Error('CÃ¡mara no disponible');
  
  const photo = await cameraRef.takePictureAsync({
    quality: 0.5,
    base64: true,
    skipProcessing: true,
  });
  
  return {
    uri: photo.uri,
    base64: photo.base64,
    width: photo.width,
    height: photo.height,
  };
}

