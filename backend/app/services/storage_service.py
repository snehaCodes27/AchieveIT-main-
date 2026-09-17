import os
import mimetypes
import logging
from typing import Optional, Union
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger('app.services.storage_service')

CERTIFICATES_BUCKET = 'certificates'

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    supabase_url = settings.SUPABASE_URL
    supabase_key = settings.SUPABASE_KEY

    if not supabase_url or not supabase_key:
        logger.warning('Supabase Storage configuration incomplete (SUPABASE_URL or SUPABASE_KEY missing).')
        return None

    try:
        _supabase_client = create_client(supabase_url, supabase_key)
        return _supabase_client
    except Exception as e:
        logger.error(f'Failed to initialize Supabase client: {str(e)}')
        return None


def upload_certificate_to_supabase(
    user_id: int,
    file_source: Union[str, bytes],
    filename: str,
    content_type: Optional[str] = None
) -> str:
    """
    Uploads a certificate file to the private 'certificates' Supabase Storage bucket.
    Object path inside bucket: {user_id}/{clean_filename}
    Returns reference: certificates/{user_id}/{clean_filename}
    """
    client = get_supabase_client()
    if not client:
        raise RuntimeError('Supabase client is not available for certificate storage.')

    clean_filename = os.path.basename(filename).replace(' ', '_')
    bucket_rel_path = f'{user_id}/{clean_filename}'
    db_storage_ref = f'certificates/{bucket_rel_path}'

    if not content_type:
        guessed_type, _ = mimetypes.guess_type(filename)
        content_type = guessed_type or 'application/octet-stream'

    try:
        if isinstance(file_source, str):
            with open(file_source, 'rb') as f:
                file_bytes = f.read()
        else:
            file_bytes = file_source

        res = client.storage.from_(CERTIFICATES_BUCKET).upload(
            path=bucket_rel_path,
            file=file_bytes,
            file_options={
                'content-type': content_type,
                'upsert': 'true'
            }
        )
        logger.info(f'Certificate successfully uploaded to Supabase Storage: {db_storage_ref}')
        return db_storage_ref

    except Exception as e:
        logger.error(f'Error uploading certificate to Supabase Storage: {str(e)}')
        raise RuntimeError(f'Storage upload failed: {str(e)}')


def generate_signed_certificate_url(storage_path_or_url: Optional[str], expires_in: int = 3600) -> Optional[str]:
    if not storage_path_or_url or not storage_path_or_url.strip():
        return None

    cleaned = storage_path_or_url.strip()

    if cleaned.startswith('/uploads/') or cleaned.startswith('uploads/') or (cleaned.startswith('http') and '/uploads/' in cleaned):
        if not cleaned.startswith('http'):
            slash_prefix = '' if cleaned.startswith('/') else '/'
            return f'http://localhost:8000{slash_prefix}{cleaned}'
        return cleaned

    if cleaned.startswith('http://') or cleaned.startswith('https://'):
        return cleaned

    client = get_supabase_client()
    if not client:
        logger.warning('Cannot generate signed URL: Supabase client unavailable.')
        return None

    try:
        object_path = cleaned
        if object_path.startswith(f'{CERTIFICATES_BUCKET}/'):
            object_path = object_path[len(CERTIFICATES_BUCKET) + 1:]

        res = client.storage.from_(CERTIFICATES_BUCKET).create_signed_url(
            path=object_path,
            expires_in=expires_in
        )

        if isinstance(res, dict):
            return res.get('signedURL') or res.get('signedUrl')
        return getattr(res, 'signed_url', str(res))

    except Exception as e:
        logger.error(f'Error creating signed URL for {cleaned}: {str(e)}')
        return None


def delete_certificate_from_supabase(storage_path: str) -> bool:
    if not storage_path or not storage_path.strip():
        return False

    client = get_supabase_client()
    if not client:
        return False

    try:
        object_path = storage_path.strip()
        if object_path.startswith(f'{CERTIFICATES_BUCKET}/'):
            object_path = object_path[len(CERTIFICATES_BUCKET) + 1:]

        client.storage.from_(CERTIFICATES_BUCKET).remove([object_path])
        return True
    except Exception as e:
        logger.error(f'Error deleting object from Supabase Storage: {str(e)}')
        return False
