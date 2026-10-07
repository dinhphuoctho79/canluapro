import { useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { RiceBatch } from '../types';

export interface UseRealtimeSyncProps {
  batch: RiceBatch;
  roomCode?: string;
  isViewerOnly?: boolean;
  onRemoteBatchReceived: (syncedBatch: RiceBatch) => void;
}

export function useRealtimeBatchSync({
  batch,
  roomCode,
  isViewerOnly = false,
  onRemoteBatchReceived,
}: UseRealtimeSyncProps) {
  const isSelfBroadcastingRef = useRef(false);
  const activeChannelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  // Xác định mã phòng: ưu tiên roomCode truyền vào hoặc mã mẻ cân batch.code
  const targetRoom = roomCode || batch.code;

  useEffect(() => {
    if (!supabase || !targetRoom) return;

    let isMounted = true;
    const channelName = `rice_batch_${targetRoom.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    const setupChannel = () => {
      if (!supabase) return;
      if (activeChannelRef.current) {
        supabase.removeChannel(activeChannelRef.current);
      }

      // Kênh WebSocket Realtime cho phép người dùng khách (Guest / Anonymous) không cần đăng nhập vẫn nhận được dữ liệu khi quét QR
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: {
            self: false, // Không nhận lại broadcast của chính mình
            ack: false,
          },
        },
      });
      activeChannelRef.current = channel;

      channel
        .on('broadcast', { event: 'batch_update' }, ({ payload }) => {
          if (!payload || !payload.id) return;
          // Nếu chính mình vừa phát sóng, bỏ qua để tránh echo loop
          if (isSelfBroadcastingRef.current) return;

          onRemoteBatchReceived(payload as RiceBatch);
        })
        .on('broadcast', { event: 'request_latest_batch' }, () => {
          // Khi máy điện thoại nông dân vừa quét QR vào phòng, máy thợ cân phát ngay mẻ hiện tại
          if (!isViewerOnly && batch && activeChannelRef.current) {
            activeChannelRef.current.send({
              type: 'broadcast',
              event: 'batch_update',
              payload: batch,
            });
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Nếu là máy nông dân vừa kết nối thành công, chủ động yêu cầu máy thợ cân gửi dữ liệu mới nhất
            if (isViewerOnly && channel) {
              channel.send({
                type: 'broadcast',
                event: 'request_latest_batch',
                payload: { requester: 'farmer_hud' },
              });
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            // Tự động thử kết nối lại sau 3s nếu lỗi sóng 3G/4G
            if (isMounted) {
              setTimeout(setupChannel, 3000);
            }
          }
        });
    };

    setupChannel();

    // Tự động kết nối lại khi điện thoại bắt sóng mạng lại
    const handleOnline = () => {
      setupChannel();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      if (activeChannelRef.current && supabase) {
        supabase.removeChannel(activeChannelRef.current);
        activeChannelRef.current = null;
      }
    };
  }, [targetRoom, isViewerOnly, batch, onRemoteBatchReceived]);

  // Hàm phát sóng dữ liệu (cho thợ cân khi nhập cân)
  const broadcastBatch = useCallback(
    (updatedBatch: RiceBatch) => {
      if (isViewerOnly || !supabase || !activeChannelRef.current) return;

      isSelfBroadcastingRef.current = true;
      activeChannelRef.current.send({
        type: 'broadcast',
        event: 'batch_update',
        payload: updatedBatch,
      });

      // Reset flag sau 150ms
      setTimeout(() => {
        isSelfBroadcastingRef.current = false;
      }, 150);
    },
    [isViewerOnly]
  );

  return { broadcastBatch };
}
