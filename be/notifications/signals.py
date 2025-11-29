# notifications/signals.py
"""
Django signals để tự động gửi notification khi có sự kiện
Trigger points:
- Booking created → gửi cho Partner
- Booking confirmed/rejected → gửi cho Customer
- Booking cancelled → gửi cho Partner
- Restaurant created → gửi cho Admin
- Restaurant approved/rejected/suspended → gửi cho Partner
- Partner registered → gửi cho Admin
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Notification


@receiver(post_save, sender='bookings.Booking')
def notify_on_booking_change(sender, instance, created, **kwargs):
    """
    Gửi notification khi booking thay đổi trạng thái
    """
    booking = instance
    
    if created:
        # Booking mới tạo → gửi cho Partner
        partner_user = booking.restaurant.partner.user
        Notification.create_notification(
            user=partner_user,
            title='Đơn đặt bàn mới',
            message=f'Bạn có đơn đặt bàn mới từ {booking.customer.full_name or booking.customer.phone_number} '
                   f'tại {booking.restaurant.name} vào {booking.booking_date.strftime("%d/%m/%Y")} '
                   f'lúc {booking.time_slot.start_time.strftime("%H:%M")}',
            notification_type='BOOKING',
            related_type='booking',
            related_id=booking.id
        )
    else:
        # Booking đã tồn tại, check status change
        # Nếu status thay đổi
        if hasattr(booking, '_old_status') and booking.status != booking._old_status:
            
            if booking.status == 'CONFIRMED':
                # Partner xác nhận → gửi cho Customer
                Notification.create_notification(
                    user=booking.customer,
                    title='Đặt bàn đã được xác nhận',
                    message=f'Đơn đặt bàn của bạn tại {booking.restaurant.name} '
                           f'vào {booking.booking_date.strftime("%d/%m/%Y")} '
                           f'lúc {booking.time_slot.start_time.strftime("%H:%M")} đã được xác nhận.',
                    notification_type='BOOKING',
                    related_type='booking',
                    related_id=booking.id
                )
            
            elif booking.status == 'REJECTED':
                # Partner từ chối → gửi cho Customer
                Notification.create_notification(
                    user=booking.customer,
                    title='Đặt bàn bị từ chối',
                    message=f'Rất tiếc, đơn đặt bàn của bạn tại {booking.restaurant.name} '
                           f'vào {booking.booking_date.strftime("%d/%m/%Y")} '
                           f'lúc {booking.time_slot.start_time.strftime("%H:%M")} đã bị từ chối.',
                    notification_type='BOOKING',
                    related_type='booking',
                    related_id=booking.id
                )
            
            elif booking.status == 'CANCELLED':
                # Customer hủy → gửi cho Partner
                partner_user = booking.restaurant.partner.user
                Notification.create_notification(
                    user=partner_user,
                    title='Đơn đặt bàn bị hủy',
                    message=f'Đơn đặt bàn từ {booking.customer.full_name or booking.customer.phone_number} '
                           f'tại {booking.restaurant.name} vào {booking.booking_date.strftime("%d/%m/%Y")} '
                           f'lúc {booking.time_slot.start_time.strftime("%H:%M")} đã bị hủy.',
                    notification_type='BOOKING',
                    related_type='booking',
                    related_id=booking.id
                )
            
            elif booking.status == 'COMPLETED':
                # Partner đánh dấu hoàn thành → gửi cho Customer
                Notification.create_notification(
                    user=booking.customer,
                    title='Cảm ơn bạn đã sử dụng dịch vụ',
                    message=f'Hy vọng bạn đã có trải nghiệm tuyệt vời tại {booking.restaurant.name}. '
                           f'Hẹn gặp lại bạn lần sau!',
                    notification_type='BOOKING',
                    related_type='booking',
                    related_id=booking.id
                )


@receiver(pre_save, sender='bookings.Booking')
def store_old_booking_status(sender, instance, **kwargs):
    """
    Lưu status cũ trước khi save để so sánh
    """
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except sender.DoesNotExist:
            instance._old_status = None


@receiver(post_save, sender='restaurants.Restaurant')
def notify_on_restaurant_change(sender, instance, created, **kwargs):
    """
    Gửi notification khi restaurant được tạo hoặc thay đổi trạng thái
    """
    restaurant = instance
    
    if created:
        # Restaurant mới tạo → gửi cho tất cả Admin và Partner
        if restaurant.status == 'PENDING':
            from accounts.models import User
            admins = User.objects.filter(role='ADMIN', is_active=True)
            
            # Gửi cho tất cả Admin
            for admin in admins:
                Notification.create_notification(
                    user=admin,
                    title='Nhà hàng mới cần duyệt',
                    message=f'Nhà hàng "{restaurant.name}" từ đối tác {restaurant.partner.business_name} '
                           f'vừa đăng ký và đang chờ phê duyệt.',
                    notification_type='RESTAURANT',
                    related_type='restaurant',
                    related_id=restaurant.id
                )
            
            # Gửi cho Partner xác nhận đã tạo
            partner_user = restaurant.partner.user
            Notification.create_notification(
                user=partner_user,
                title='Nhà hàng đã được tạo',
                message=f'Nhà hàng "{restaurant.name}" của bạn đã được tạo thành công '
                       f'và đang chờ admin phê duyệt. Chúng tôi sẽ thông báo khi có kết quả.',
                notification_type='RESTAURANT',
                related_type='restaurant',
                related_id=restaurant.id
            )
    
    else:
        # Restaurant đã tồn tại, check status change
        if hasattr(restaurant, '_old_status') and restaurant.status != restaurant._old_status:
            partner_user = restaurant.partner.user
            
            if restaurant.status == 'APPROVED':
                # Admin duyệt → gửi cho Partner
                Notification.create_notification(
                    user=partner_user,
                    title='Nhà hàng đã được duyệt',
                    message=f'Chúc mừng! Nhà hàng "{restaurant.name}" của bạn đã được duyệt '
                           f'và có thể bắt đầu nhận đặt bàn.',
                    notification_type='RESTAURANT',
                    related_type='restaurant',
                    related_id=restaurant.id
                )
            
            elif restaurant.status == 'SUSPENDED':
                # Admin tạm ngưng → gửi cho Partner
                Notification.create_notification(
                    user=partner_user,
                    title='Nhà hàng bị tạm ngưng',
                    message=f'Nhà hàng "{restaurant.name}" của bạn đã bị tạm ngưng hoạt động. '
                           f'Vui lòng liên hệ admin để biết thêm chi tiết.',
                    notification_type='RESTAURANT',
                    related_type='restaurant',
                    related_id=restaurant.id
                )
            
            elif restaurant.status == 'CLOSED':
                # Admin đóng cửa → gửi cho Partner
                Notification.create_notification(
                    user=partner_user,
                    title='Nhà hàng đã đóng cửa',
                    message=f'Nhà hàng "{restaurant.name}" của bạn đã được đánh dấu đóng cửa.',
                    notification_type='RESTAURANT',
                    related_type='restaurant',
                    related_id=restaurant.id
                )


@receiver(pre_save, sender='restaurants.Restaurant')
def store_old_restaurant_status(sender, instance, **kwargs):
    """
    Lưu status cũ của restaurant
    """
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except sender.DoesNotExist:
            instance._old_status = None


@receiver(post_save, sender='accounts.Partner')
def notify_on_partner_registration(sender, instance, created, **kwargs):
    """
    Gửi notification cho Admin khi có Partner mới đăng ký
    """
    if created and instance.status == 'PENDING':
        from accounts.models import User
        admins = User.objects.filter(role='ADMIN', is_active=True)
        
        # Gửi cho tất cả Admin
        for admin in admins:
            Notification.create_notification(
                user=admin,
                title='Đối tác mới cần duyệt',
                message=f'Đối tác "{instance.business_name}" (SĐT: {instance.user.phone_number}) '
                       f'vừa đăng ký và đang chờ phê duyệt.',
                notification_type='SYSTEM',
                related_type='partner',
                related_id=instance.user_id
            )
        
        # Gửi cho Partner xác nhận đã đăng ký
        Notification.create_notification(
            user=instance.user,
            title='Đăng ký đối tác thành công',
            message=f'Cảm ơn bạn đã đăng ký làm đối tác với chúng tôi. '
                   f'Tài khoản của bạn đang chờ admin phê duyệt.',
            notification_type='SYSTEM',
            related_type='partner',
            related_id=instance.user_id
        )


@receiver(post_save, sender='accounts.Partner')
def notify_on_partner_status_change(sender, instance, created, **kwargs):
    """
    Gửi notification cho Partner khi status thay đổi
    """
    if not created and hasattr(instance, '_old_status') and instance.status != instance._old_status:
        
        if instance.status == 'ACTIVE':
            # Admin duyệt Partner
            Notification.create_notification(
                user=instance.user,
                title='Tài khoản đối tác đã được duyệt',
                message=f'Chúc mừng! Tài khoản đối tác của bạn đã được phê duyệt. '
                       f'Bạn có thể bắt đầu đăng ký nhà hàng.',
                notification_type='SYSTEM',
                related_type='partner',
                related_id=instance.user_id
            )
        
        elif instance.status == 'SUSPENDED':
            # Admin tạm ngưng Partner
            Notification.create_notification(
                user=instance.user,
                title='Tài khoản đối tác bị tạm ngưng',
                message=f'Tài khoản đối tác của bạn đã bị tạm ngưng. '
                       f'Vui lòng liên hệ admin để biết thêm chi tiết.',
                notification_type='SYSTEM',
                related_type='partner',
                related_id=instance.user_id
            )


@receiver(pre_save, sender='accounts.Partner')
def store_old_partner_status(sender, instance, **kwargs):
    """
    Lưu status cũ của Partner
    """
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except sender.DoesNotExist:
            instance._old_status = None